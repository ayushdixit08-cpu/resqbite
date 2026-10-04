from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import User
from donations.models import Donation
from notifications.models import Notification
from organizations.models import Organization
from pickups.models import PickupTask
from volunteers.models import VolunteerProfile


class DonationAPITests(APITestCase):
    def setUp(self):
        self.donor = User.objects.create_user(
            email="donor@example.test",
            name="Donor",
            role=User.ROLE_DONOR,
        )
        self.ngo = User.objects.create_user(
            email="ngo@example.test",
            name="NGO",
            role=User.ROLE_NGO,
        )
        self.organization = Organization.objects.create(
            user=self.ngo,
            name="Verified NGO",
            address="20 Receiver Road",
            latitude="28.620000",
            longitude="77.210000",
            verification_status=Organization.VERIFICATION_VERIFIED,
        )
        self.client.force_authenticate(self.donor)

    def donation_payload(self):
        now = timezone.now()
        return {
            "organization": str(self.organization.id),
            "food_name": "Fresh meals",
            "category": "VEG",
            "food_type": "Vegetarian",
            "quantity": "20",
            "quantity_unit": "servings",
            "people_served": 20,
            "prepared_at": now.isoformat(),
            "expires_at": (now + timedelta(hours=5)).isoformat(),
            "pickup_address": "10 Test Street",
            "latitude": "28.613900",
            "longitude": "77.209000",
            "food_safety": {
                "freshly_prepared": True,
                "properly_packed": True,
                "expiry_marked": True,
                "food_type_marked": True,
                "allergens": "",
            },
        }

    def create_donation(self):
        response = self.client.post("/api/donations/", self.donation_payload(), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        return response.data["data"]["id"]

    def test_donor_creation_persists_target_and_exposes_real_pickup_to_volunteers(self):
        donation_id = self.create_donation()
        donation = Donation.objects.get(pk=donation_id)
        task = PickupTask.objects.get(donation=donation)

        self.assertEqual(donation.donor, self.donor)
        self.assertEqual(donation.organization, self.organization)
        self.assertTrue(donation.food_safety.properly_packed)
        self.assertEqual(task.organization, self.organization)
        self.assertIsNone(task.volunteer_id)
        self.assertTrue(Notification.objects.filter(
            recipient=self.organization.user,
            notification_type="PICKUP_AVAILABLE",
            data__donation_id=str(donation.id),
        ).exists())

        volunteer = User.objects.create_user(
            email="volunteer@example.test",
            name="Volunteer",
            role=User.ROLE_VOLUNTEER,
        )
        VolunteerProfile.objects.create(user=volunteer)
        self.client.force_authenticate(volunteer)
        available = self.client.get("/api/volunteers/tasks/")
        self.assertEqual(available.status_code, 200, available.data)
        self.assertIn(str(task.id), [row["id"] for row in available.data["data"]["results"]])

    def test_safety_checklist_must_be_confirmed(self):
        payload = self.donation_payload()
        payload["food_safety"]["properly_packed"] = False
        response = self.client.post("/api/donations/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Donation.objects.count(), 0)
        self.assertEqual(PickupTask.objects.count(), 0)

    def test_donor_cannot_create_donation_for_unverified_organization(self):
        unverified_user = User.objects.create_user(
            email="unverified@example.test",
            name="Unverified NGO",
            role=User.ROLE_NGO,
        )
        unverified = Organization.objects.create(user=unverified_user, name="Unverified")
        payload = self.donation_payload()
        payload["organization"] = str(unverified.id)
        response = self.client.post("/api/donations/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Donation.objects.count(), 0)

    def test_donor_cannot_select_verified_organization_with_inactive_user(self):
        inactive_user = User.objects.create_user(
            email="inactive-ngo@example.test",
            name="Inactive NGO",
            role=User.ROLE_NGO,
            is_active=False,
        )
        inactive_organization = Organization.objects.create(
            user=inactive_user,
            name="Inactive verified NGO",
            verification_status=Organization.VERIFICATION_VERIFIED,
        )
        payload = self.donation_payload()
        payload["organization"] = str(inactive_organization.id)

        response = self.client.post("/api/donations/", payload, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Donation.objects.count(), 0)
        self.assertEqual(PickupTask.objects.count(), 0)

    def test_volunteer_first_delivery_requires_ngo_receipt_to_complete(self):
        donation_id = self.create_donation()
        task = PickupTask.objects.get(donation_id=donation_id)
        volunteer = User.objects.create_user(
            email="volunteer@example.test",
            name="Volunteer",
            role=User.ROLE_VOLUNTEER,
        )
        profile = VolunteerProfile.objects.create(user=volunteer)

        self.client.force_authenticate(volunteer)
        accepted = self.client.post(f"/api/volunteers/tasks/{task.id}/accept/", {}, format="json")
        self.assertEqual(accepted.status_code, 200, accepted.data)
        self.assertEqual(Donation.objects.get(pk=donation_id).status, Donation.STATUS_ACCEPTED)

        started = self.client.patch(
            f"/api/volunteers/tasks/{task.id}/status/",
            {"status": PickupTask.STATUS_PICKUP_STARTED},
            format="json",
        )
        self.assertEqual(started.status_code, 200, started.data)

        self.client.force_authenticate(self.donor)
        qr = self.client.post(f"/api/donations/qr/{donation_id}/generate/", {}, format="json")
        self.assertEqual(qr.status_code, 201, qr.data)
        token = qr.data["data"]["token"]

        self.client.force_authenticate(volunteer)
        picked_up = self.client.post(
            "/api/donations/qr/verify/",
            {"donation_id": donation_id, "token": token, "stage": "PICKUP"},
            format="json",
        )
        self.assertEqual(picked_up.status_code, 200, picked_up.data)
        transit = self.client.patch(
            f"/api/volunteers/tasks/{task.id}/status/",
            {"status": PickupTask.STATUS_IN_TRANSIT},
            format="json",
        )
        self.assertEqual(transit.status_code, 200, transit.data)
        self.assertEqual(Donation.objects.get(pk=donation_id).status, Donation.STATUS_IN_TRANSIT)

        delivered = self.client.post(
            "/api/donations/qr/verify/",
            {"donation_id": donation_id, "token": token, "stage": "DELIVERY"},
            format="json",
        )
        self.assertEqual(delivered.status_code, 200, delivered.data)
        donation = Donation.objects.get(pk=donation_id)
        task.refresh_from_db()
        self.assertEqual(donation.status, Donation.STATUS_DELIVERED)
        self.assertEqual(task.status, PickupTask.STATUS_DELIVERED)

        self.client.force_authenticate(self.organization.user)
        received = self.client.post(f"/api/donations/{donation_id}/receive/", {}, format="json")
        self.assertEqual(received.status_code, 200, received.data)
        donation.refresh_from_db()
        self.assertEqual(donation.status, Donation.STATUS_COMPLETED)
        self.assertGreater(profile.__class__.objects.get(pk=profile.pk).points, 0)
        self.assertTrue(Notification.objects.filter(
            recipient=self.donor,
            notification_type="FOOD_DELIVERED",
        ).exists())

    def test_other_donor_and_ngo_cannot_access_assigned_donation(self):
        donation_id = self.create_donation()
        other_donor = User.objects.create_user(
            email="other-donor@example.test",
            name="Other donor",
            role=User.ROLE_DONOR,
        )
        other_ngo = User.objects.create_user(
            email="other-ngo@example.test",
            name="Other NGO",
            role=User.ROLE_NGO,
        )
        Organization.objects.create(
            user=other_ngo,
            name="Other verified NGO",
            verification_status=Organization.VERIFICATION_VERIFIED,
        )

        self.client.force_authenticate(other_donor)
        self.assertEqual(self.client.get(f"/api/donations/{donation_id}/").status_code, 404)
        self.client.force_authenticate(other_ngo)
        self.assertEqual(self.client.get(f"/api/donations/{donation_id}/").status_code, 404)
        self.assertEqual(self.client.post(f"/api/donations/{donation_id}/receive/", {}, format="json").status_code, 404)

    def test_non_ngo_cannot_browse_available_donations(self):
        response = self.client.get("/api/donations/search/")
        self.assertEqual(response.status_code, 403)
