const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

const addTracking = (donationId, status, note, updatedBy) => {
  db.prepare(`
    INSERT INTO donation_tracking (id, donation_id, status, note, updated_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(uuidv4(), donationId, status, note || null, updatedBy || null);
};

const notify = (userId, title, message) => {
  db.prepare(`
    INSERT INTO notifications (id, user_id, title, message)
    VALUES (?, ?, ?, ?)
  `).run(uuidv4(), userId, title, message);
};

const getDonationOr404 = (id, res) => {
  const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get(id);
  if (!donation) {
    res.status(404).json({ success: false, message: 'Donation not found.' });
    return null;
  }
  return donation;
};

// ---------------------------------------------------------------------------
// POST /api/donations - create a donation (donor only)
// ---------------------------------------------------------------------------
router.post(
  '/',
  authenticate,
  authorize('donor'),
  upload.single('image'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('food_type').isIn(['veg', 'non_veg', 'mixed', 'packaged', 'bakery', 'other']),
    body('quantity').isFloat({ gt: 0 }).withMessage('Quantity must be greater than 0'),
    body('pickup_address').trim().notEmpty().withMessage('Pickup address is required')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      title, description, food_type, quantity, quantity_unit,
      expiry_time, pickup_address, pickup_city, latitude, longitude
    } = req.body;

    const id = uuidv4();
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    db.prepare(`
      INSERT INTO donations
        (id, donor_id, title, description, food_type, quantity, quantity_unit, expiry_time, pickup_address, pickup_city, latitude, longitude, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, req.user.id, title, description || null, food_type, quantity,
      quantity_unit || 'servings', expiry_time || null, pickup_address,
      pickup_city || null, latitude || null, longitude || null, image_url
    );

    addTracking(id, 'pending', 'Donation created, awaiting NGO acceptance', req.user.id);

    const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get(id);
    res.status(201).json({ success: true, donation });
  }
);

// ---------------------------------------------------------------------------
// GET /api/donations - list/search/filter donations
// Query params: status, food_type, city, donor_id, page, limit
// ---------------------------------------------------------------------------
router.get('/', authenticate, (req, res) => {
  const { status, food_type, city, donor_id } = req.query;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;

  const clauses = [];
  const params = [];

  if (status) { clauses.push('status = ?'); params.push(status); }
  if (food_type) { clauses.push('food_type = ?'); params.push(food_type); }
  if (city) { clauses.push('pickup_city = ?'); params.push(city); }
  if (donor_id) { clauses.push('donor_id = ?'); params.push(donor_id); }

  // Donors only see their own donations by default unless admin/ngo/volunteer
  if (req.user.role === 'donor' && !donor_id) {
    clauses.push('donor_id = ?');
    params.push(req.user.id);
  }
  if (req.user.role === 'ngo' && req.query.mine === 'true') {
    clauses.push('accepted_by_ngo_id = ?');
    params.push(req.user.id);
  }
  if (req.user.role === 'volunteer' && req.query.mine === 'true') {
    clauses.push('assigned_volunteer_id = ?');
    params.push(req.user.id);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) as count FROM donations ${where}`).get(...params).count;
  const donations = db.prepare(`
    SELECT * FROM donations ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({
    success: true,
    count: donations.length,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    donations
  });
});

// ---------------------------------------------------------------------------
// GET /api/donations/:id - get single donation with tracking history
// ---------------------------------------------------------------------------
router.get('/:id', authenticate, (req, res) => {
  const donation = getDonationOr404(req.params.id, res);
  if (!donation) return;

  const tracking = db.prepare(`
    SELECT * FROM donation_tracking WHERE donation_id = ? ORDER BY created_at ASC
  `).all(req.params.id);

  res.json({ success: true, donation, tracking });
});

// ---------------------------------------------------------------------------
// GET /api/donations/:id/tracking - live tracking view for the donor-facing
// tracking page: the donation itself, the assigned volunteer (enriched with
// a real computed rating + delivery count, not stored/fake numbers), the
// accepting NGO, and the full real status timeline. Every field is either
// a real column from SQLite or a real aggregate computed from it - there is
// no synthetic ETA, name, or percentage anywhere in this response.
// ---------------------------------------------------------------------------
router.get('/:id/tracking', authenticate, (req, res) => {
  const donation = getDonationOr404(req.params.id, res);
  if (!donation) return;

  // Only people actually party to this donation (or an admin) may view it.
  const isDonor = req.user.role === 'donor' && donation.donor_id === req.user.id;
  const isAcceptingNgo = req.user.role === 'ngo' && donation.accepted_by_ngo_id === req.user.id;
  const isAssignedVolunteer = req.user.role === 'volunteer' && donation.assigned_volunteer_id === req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!isDonor && !isAcceptingNgo && !isAssignedVolunteer && !isAdmin) {
    return res.status(403).json({ success: false, message: 'You do not have permission to view this donation.' });
  }

  let volunteer = null;
  if (donation.assigned_volunteer_id) {
    const v = db.prepare(`
      SELECT id, name, phone, latitude, longitude FROM users WHERE id = ?
    `).get(donation.assigned_volunteer_id);

    if (v) {
      // Real aggregate rating from the ratings table (null if nobody has
      // rated this volunteer yet - never a fabricated default like 4.9).
      const ratingRow = db.prepare(`
        SELECT AVG(score) as avgScore, COUNT(*) as count FROM ratings WHERE rated_user = ?
      `).get(v.id);

      // Real count of donations this volunteer has actually delivered.
      const deliveredRow = db.prepare(`
        SELECT COUNT(*) as count FROM donations WHERE assigned_volunteer_id = ? AND status = 'delivered'
      `).get(v.id);

      volunteer = {
        id: v.id,
        name: v.name,
        phone: v.phone,
        latitude: v.latitude,
        longitude: v.longitude,
        rating: ratingRow.count > 0 ? Math.round(ratingRow.avgScore * 10) / 10 : null,
        deliveries: deliveredRow.count
      };
    }
  }

  let organization = null;
  if (donation.accepted_by_ngo_id) {
    const org = db.prepare(`
      SELECT id, name, organization_name, address, city FROM users WHERE id = ?
    `).get(donation.accepted_by_ngo_id);

    if (org) {
      organization = {
        id: org.id,
        name: org.organization_name || org.name,
        type: 'NGO',
        address: org.address,
        city: org.city
      };
    }
  }

  const timeline = db.prepare(`
    SELECT id, status, note, created_at FROM donation_tracking WHERE donation_id = ? ORDER BY created_at ASC
  `).all(req.params.id);

  res.json({ success: true, donation, volunteer, organization, timeline });
});

// ---------------------------------------------------------------------------
// PUT /api/donations/:id - update donation details (donor, while still pending)
// ---------------------------------------------------------------------------
router.put('/:id', authenticate, authorize('donor'), (req, res) => {
  const donation = getDonationOr404(req.params.id, res);
  if (!donation) return;

  if (donation.donor_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'You can only edit your own donations.' });
  }
  if (donation.status !== 'pending') {
    return res.status(400).json({ success: false, message: 'Only pending donations can be edited.' });
  }

  const allowedFields = ['title', 'description', 'food_type', 'quantity', 'quantity_unit', 'expiry_time', 'pickup_address', 'pickup_city', 'latitude', 'longitude'];
  const updates = [];
  const params = [];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ success: false, message: 'No valid fields to update.' });
  }

  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);

  db.prepare(`UPDATE donations SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  const updated = db.prepare('SELECT * FROM donations WHERE id = ?').get(req.params.id);
  res.json({ success: true, donation: updated });
});

// ---------------------------------------------------------------------------
// PATCH /api/donations/:id/accept - NGO accepts a pending donation
// ---------------------------------------------------------------------------
router.patch('/:id/accept', authenticate, authorize('ngo'), (req, res) => {
  const donation = getDonationOr404(req.params.id, res);
  if (!donation) return;

  if (donation.status !== 'pending') {
    return res.status(400).json({ success: false, message: `Cannot accept a donation with status '${donation.status}'.` });
  }

  db.prepare(`
    UPDATE donations SET status = 'accepted', accepted_by_ngo_id = ?, updated_at = datetime('now') WHERE id = ?
  `).run(req.user.id, req.params.id);

  addTracking(req.params.id, 'accepted', `Accepted by NGO ${req.user.email}`, req.user.id);
  notify(donation.donor_id, 'Donation Accepted', `Your donation "${donation.title}" has been accepted by an NGO.`);

  const updated = db.prepare('SELECT * FROM donations WHERE id = ?').get(req.params.id);
  res.json({ success: true, donation: updated });
});

// ---------------------------------------------------------------------------
// PATCH /api/donations/:id/assign - NGO assigns a volunteer for pickup/delivery
// ---------------------------------------------------------------------------
router.patch(
  '/:id/assign',
  authenticate,
  authorize('ngo'),
  [body('volunteer_id').notEmpty().withMessage('volunteer_id is required')],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const donation = getDonationOr404(req.params.id, res);
    if (!donation) return;

    if (donation.accepted_by_ngo_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the NGO that accepted this donation can assign a volunteer.' });
    }
    if (donation.status !== 'accepted') {
      return res.status(400).json({ success: false, message: `Cannot assign a volunteer to a donation with status '${donation.status}'.` });
    }

    const volunteer = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'volunteer'").get(req.body.volunteer_id);
    if (!volunteer) {
      return res.status(404).json({ success: false, message: 'Volunteer not found.' });
    }

    db.prepare(`
      UPDATE donations SET status = 'assigned', assigned_volunteer_id = ?, updated_at = datetime('now') WHERE id = ?
    `).run(volunteer.id, req.params.id);

    addTracking(req.params.id, 'assigned', `Assigned to volunteer ${volunteer.name}`, req.user.id);
    notify(volunteer.id, 'New Pickup Assigned', `You have been assigned to pick up "${donation.title}".`);

    const updated = db.prepare('SELECT * FROM donations WHERE id = ?').get(req.params.id);
    res.json({ success: true, donation: updated });
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/donations/:id/pickup - volunteer marks food picked up
// ---------------------------------------------------------------------------
router.patch('/:id/pickup', authenticate, authorize('volunteer'), (req, res) => {
  const donation = getDonationOr404(req.params.id, res);
  if (!donation) return;

  if (donation.assigned_volunteer_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'You are not assigned to this donation.' });
  }
  if (donation.status !== 'assigned') {
    return res.status(400).json({ success: false, message: `Cannot mark picked up from status '${donation.status}'.` });
  }

  db.prepare("UPDATE donations SET status = 'picked_up', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
  addTracking(req.params.id, 'picked_up', req.body.note || 'Food picked up by volunteer', req.user.id);
  notify(donation.donor_id, 'Food Picked Up', `Your donation "${donation.title}" has been picked up.`);

  const updated = db.prepare('SELECT * FROM donations WHERE id = ?').get(req.params.id);
  res.json({ success: true, donation: updated });
});

// ---------------------------------------------------------------------------
// PATCH /api/donations/:id/deliver - volunteer marks delivered
// ---------------------------------------------------------------------------
router.patch('/:id/deliver', authenticate, authorize('volunteer'), (req, res) => {
  const donation = getDonationOr404(req.params.id, res);
  if (!donation) return;

  if (donation.assigned_volunteer_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'You are not assigned to this donation.' });
  }
  if (donation.status !== 'picked_up') {
    return res.status(400).json({ success: false, message: `Cannot mark delivered from status '${donation.status}'.` });
  }

  db.prepare("UPDATE donations SET status = 'delivered', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
  addTracking(req.params.id, 'delivered', req.body.note || 'Food delivered successfully', req.user.id);
  notify(donation.donor_id, 'Delivery Complete', `Your donation "${donation.title}" was delivered successfully. Thank you!`);
  if (donation.accepted_by_ngo_id) {
    notify(donation.accepted_by_ngo_id, 'Delivery Complete', `Donation "${donation.title}" was delivered successfully.`);
  }

  const updated = db.prepare('SELECT * FROM donations WHERE id = ?').get(req.params.id);
  res.json({ success: true, donation: updated });
});

// ---------------------------------------------------------------------------
// PATCH /api/donations/:id/cancel - donor or NGO cancels
// ---------------------------------------------------------------------------
router.patch('/:id/cancel', authenticate, authorize('donor', 'ngo', 'admin'), (req, res) => {
  const donation = getDonationOr404(req.params.id, res);
  if (!donation) return;

  const isOwnerDonor = req.user.role === 'donor' && donation.donor_id === req.user.id;
  const isAcceptingNgo = req.user.role === 'ngo' && donation.accepted_by_ngo_id === req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!isOwnerDonor && !isAcceptingNgo && !isAdmin) {
    return res.status(403).json({ success: false, message: 'You do not have permission to cancel this donation.' });
  }
  if (['delivered', 'cancelled'].includes(donation.status)) {
    return res.status(400).json({ success: false, message: `Cannot cancel a donation with status '${donation.status}'.` });
  }

  db.prepare("UPDATE donations SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
  addTracking(req.params.id, 'cancelled', req.body.reason || 'Donation cancelled', req.user.id);

  const updated = db.prepare('SELECT * FROM donations WHERE id = ?').get(req.params.id);
  res.json({ success: true, donation: updated });
});

// ---------------------------------------------------------------------------
// DELETE /api/donations/:id - donor deletes own pending donation, or admin
// ---------------------------------------------------------------------------
router.delete('/:id', authenticate, authorize('donor', 'admin'), (req, res) => {
  const donation = getDonationOr404(req.params.id, res);
  if (!donation) return;

  if (req.user.role === 'donor' && donation.donor_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'You can only delete your own donations.' });
  }

  db.prepare('DELETE FROM donations WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Donation deleted.' });
});

module.exports = router;
