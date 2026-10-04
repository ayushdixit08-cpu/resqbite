from django.contrib.auth.hashers import check_password
from rest_framework.test import APITestCase
from rest_framework.throttling import SimpleRateThrottle

from accounts.models import User


class AuthenticationAPITests(APITestCase):
    def setUp(self):
        SimpleRateThrottle.cache.clear()

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
        user = User.objects.get(email="donor@example.test")
        self.assertTrue(check_password("A-strong-password-123", user.password))
        self.assertEqual(registration.data["data"]["user"]["name"], user.name)
        self.assertEqual(registration.data["data"]["user"]["email"], user.email)

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

    def test_public_registration_allows_donor_ngo_and_volunteer_roles(self):
        roles = (
            ("donor-role@example.test", "DONOR", "DONOR"),
            ("ngo-role@example.test", "ORGANIZATION", "NGO"),
            ("volunteer-role@example.test", "VOLUNTEER", "VOLUNTEER"),
        )

        for email, requested_role, expected_role in roles:
            with self.subTest(role=expected_role):
                response = self.client.post(
                    "/api/auth/register/",
                    {
                        "email": email,
                        "name": f"{expected_role.title()} User",
                        "role": requested_role,
                        "password": "A-strong-password-123",
                    },
                    format="json",
                )
                self.assertEqual(response.status_code, 201, response.data)
                self.assertEqual(response.data["data"]["user"]["role"], expected_role)

    def test_admin_api_dashboard_and_management_routes_require_admin_role(self):
        admin = User.objects.create_superuser(
            email="admin-api@example.test",
            password="A-strong-password-123",
            name="Admin",
        )
        self.client.force_authenticate(user=admin)
        for path in (
            "/api/admin/dashboard/",
            "/api/admin/users/",
            "/api/admin/ngos/",
            "/api/admin/donations/",
            "/api/admin/deliveries/",
            "/api/admin/reports/",
        ):
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200, response.data)
                self.assertTrue(response.data["success"])

        donor = User.objects.create_user(
            email="non-admin-api@example.test",
            password="A-strong-password-123",
            name="Donor",
        )
        self.client.force_authenticate(user=donor)
        response = self.client.get("/api/admin/dashboard/")
        self.assertEqual(response.status_code, 403)

    def test_duplicate_email_is_rejected_with_useful_error(self):
        User.objects.create_user(
            email="existing@example.test",
            password="A-strong-password-123",
            name="Existing User",
        )

        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "EXISTING@example.test",
                "name": "Duplicate User",
                "password": "Another-strong-password-123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["success"])
        self.assertIn("email", response.data["errors"])
        self.assertIn(
            "An account with this email already exists.",
            str(response.data["errors"]["email"]),
        )
        self.assertEqual(User.objects.filter(email__iexact="existing@example.test").count(), 1)

    def test_invalid_email_empty_name_weak_password_and_missing_fields_are_rejected(self):
        invalid_payloads = [
            {"email": "not-an-email", "name": "User", "password": "A-strong-password-123"},
            {"email": "empty-name@example.test", "name": "   ", "password": "A-strong-password-123"},
            {"email": "weak-password@example.test", "name": "User", "password": "weak"},
            {"email": "missing-name@example.test", "password": "A-strong-password-123"},
            {"name": "Missing email", "password": "A-strong-password-123"},
            {"email": "missing-password@example.test", "name": "User"},
        ]

        for payload in invalid_payloads:
            with self.subTest(payload=payload):
                response = self.client.post(
                    "/api/auth/register/",
                    payload,
                    format="json",
                )
                self.assertEqual(response.status_code, 400, response.data)
                self.assertFalse(response.data["success"])

        self.assertEqual(User.objects.count(), 0)

    def test_health_is_public(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "ok")
