from django.test import TestCase
from rest_framework.test import APITestCase

from accounts.models import User
from .models import VolunteerProfile


class NearbyVolunteersPrivacyTests(APITestCase):
    def test_nearby_rejects_invalid_coordinates_with_standard_error_envelope(self):
        donor = User.objects.create_user(
            email="donor@example.test",
            password="Strong-test-password-123",
            name="Donor",
            role=User.ROLE_DONOR,
        )
        self.client.force_authenticate(user=donor)

        response = self.client.get(
            "/api/volunteers/nearby/?latitude=91&longitude=0&radius=10"
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["success"])
        self.assertIn("errors", response.data)

    def test_nearby_volunteer_response_omits_contact_and_exact_location(self):
        donor = User.objects.create_user(
            email="donor@example.test",
            password="A-strong-password-123",
            name="Donor",
            role=User.ROLE_DONOR,
        )
        volunteer = User.objects.create_user(
            email="volunteer@example.test",
            password="A-strong-password-123",
            name="Volunteer",
            phone="+15551234567",
            role=User.ROLE_VOLUNTEER,
        )
        volunteer.address = "Private volunteer address"
        volunteer.latitude = 28.6139
        volunteer.longitude = 77.2090
        volunteer.save()
        VolunteerProfile.objects.create(user=volunteer, is_available=True, service_radius_km=20)
        self.client.force_authenticate(user=donor)

        response = self.client.get(
            "/api/volunteers/nearby/?latitude=28.6139&longitude=77.2090&radius=10"
        )

        self.assertEqual(response.status_code, 200)
        results = response.data["data"].get("results", response.data["data"])
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["name"], "Volunteer")
        self.assertNotIn("email", results[0])
        self.assertNotIn("phone", results[0])
        self.assertNotIn("address", results[0])
        self.assertNotIn("latitude", results[0])
        self.assertNotIn("longitude", results[0])
