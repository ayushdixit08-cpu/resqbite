from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import User
from donations.models import Donation, DonationRequest
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

    def test_ngo_accepts_and_volunteer_completes_qr_verified_delivery(self):
        created = self.client.post("/api/donations/", self.donation_payload(), format="json")
        self.assertEqual(created.status_code, 201, created.data)
        donation_id = created.data["data"]["id"]

        ngo = User.objects.create_user(
            email="ngo@example.test",
            name="NGO",
            role=User.ROLE_NGO,
            password="A-strong-password-123",
        )
        organization = Organization.objects.create(
            user=ngo,
            name="Verified NGO",
            address="20 Receiver Road",
            latitude="28.620000",
            longitude="77.210000",
            verification_status=Organization.VERIFICATION_VERIFIED,
        )
        self.client.force_authenticate(ngo)
        request_response = self.client.post(
            "/api/donations/requests/",
            {"donation": donation_id, "message": "We can receive this food."},
            format="json",
        )
        self.assertEqual(request_response.status_code, 201, request_response.data)
        request_id = request_response.data["data"]["id"]

        accepted = self.client.post(f"/api/donations/requests/{request_id}/accept/", {}, format="json")
        self.assertEqual(accepted.status_code, 200, accepted.data)
        task = PickupTask.objects.get(donation_id=donation_id)
        self.assertEqual(task.organization, organization)

        volunteer = User.objects.create_user(
            email="volunteer@example.test",
            name="Volunteer",
            role=User.ROLE_VOLUNTEER,
            password="A-strong-password-123",
        )
        VolunteerProfile.objects.create(user=volunteer)
        self.client.force_authenticate(volunteer)
        task_accepted = self.client.post(f"/api/volunteers/tasks/{task.id}/accept/", {}, format="json")
        self.assertEqual(task_accepted.status_code, 200, task_accepted.data)
        self.assertEqual(
            self.client.patch(
                f"/api/volunteers/tasks/{task.id}/status/",
                {"status": PickupTask.STATUS_PICKUP_STARTED},
                format="json",
            ).status_code,
            200,
        )

        self.client.force_authenticate(self.donor)
        qr = self.client.post(f"/api/donations/qr/{donation_id}/generate/", {}, format="json")
        self.assertEqual(qr.status_code, 201, qr.data)
        token = qr.data["data"]["token"]

        self.client.force_authenticate(volunteer)
        verify_pickup = self.client.post(
            "/api/donations/qr/verify/",
            {"donation_id": donation_id, "token": token, "stage": "PICKUP"},
            format="json",
        )
        self.assertEqual(verify_pickup.status_code, 200, verify_pickup.data)
        transit = self.client.patch(
            f"/api/volunteers/tasks/{task.id}/status/",
            {"status": PickupTask.STATUS_IN_TRANSIT},
            format="json",
        )
        self.assertEqual(transit.status_code, 200, transit.data)
        verify_delivery = self.client.post(
            "/api/donations/qr/verify/",
            {"donation_id": donation_id, "token": token, "stage": "DELIVERY"},
            format="json",
        )
        self.assertEqual(verify_delivery.status_code, 200, verify_delivery.data)

        donation = Donation.objects.get(pk=donation_id)
        task.refresh_from_db()
        self.assertEqual(donation.status, Donation.STATUS_COMPLETED)
        self.assertEqual(task.status, PickupTask.STATUS_DELIVERED)
        self.assertTrue(Notification.objects.filter(recipient=self.donor, notification_type="FOOD_DELIVERED").exists())
        self.assertGreater(volunteer.volunteer_profile.points, 0)

        self.client.force_authenticate(self.donor)
        review = self.client.post(
            "/api/reviews/",
            {"donation": donation_id, "reviewed_user": str(ngo.id), "rating": 5, "feedback": "Great coordination."},
            format="json",
        )
        self.assertEqual(review.status_code, 201, review.data)
