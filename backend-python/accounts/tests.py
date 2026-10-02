from django.urls import reverse
from rest_framework.test import APITestCase


class AuthenticationAPITests(APITestCase):
    def test_registration_and_login_issue_jwt_and_never_return_password(self):
        registration = self.client.post(
            "/api/auth/register/",
            {
                "email": "donor@example.test",
                "name": "Donor",
                "role": "donor",
                "password": "A-strong-password-123",
            },
            format="json",
        )
        self.assertEqual(registration.status_code, 201, registration.data)
        self.assertTrue(registration.data["success"])
        self.assertIn("access", registration.data["data"])
        self.assertEqual(registration.data["data"]["user"]["role"], "DONOR")
        self.assertNotIn("password", registration.data["data"]["user"])

        login = self.client.post(
            "/api/auth/login/",
            {"email": "DONOR@example.test", "password": "A-strong-password-123"},
            format="json",
        )
        self.assertEqual(login.status_code, 200)
        self.assertTrue(login.data["data"]["refresh"])

    def test_public_registration_cannot_create_admin(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "admin@example.test",
                "name": "Not an admin",
                "role": "ADMIN",
                "password": "A-strong-password-123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_health_is_public(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "ok")
