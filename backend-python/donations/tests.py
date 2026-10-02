from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import User
from donations.models import Donation


class DonationAPITests(APITestCase):
    def setUp(self):
        self.donor = User.objects.create_user(
            email="donor@example.test",
            name="Donor",
            role=User.ROLE_DONOR,
            password="A-strong-password-123",
        )
        self.client.force_authenticate(self.donor)

    def donation_payload(self):
        now = timezone.now()
        return {
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

    def test_donor_can_create_and_cancel_owned_donation(self):
        response = self.client.post("/api/donations/", self.donation_payload(), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        donation_id = response.data["data"]["id"]
        donation = Donation.objects.get(pk=donation_id)
        self.assertEqual(donation.donor, self.donor)
        self.assertTrue(donation.food_safety.properly_packed)

        cancel = self.client.post(f"/api/donations/{donation_id}/cancel/", {}, format="json")
        self.assertEqual(cancel.status_code, 200, cancel.data)
        donation.refresh_from_db()
        self.assertEqual(donation.status, Donation.STATUS_CANCELLED)
        self.assertEqual(donation.tracking_events.count(), 2)

    def test_safety_checklist_is_required_and_must_be_confirmed(self):
        payload = self.donation_payload()
        payload["food_safety"]["properly_packed"] = False
        response = self.client.post("/api/donations/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Donation.objects.count(), 0)
