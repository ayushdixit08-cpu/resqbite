from django.test import TestCase

from accounts.models import User
from organizations.models import Organization
from .serializers import OrganizationSerializer
from rest_framework.test import APITestCase


class OrganizationSerializerTests(TestCase):
    def test_registration_document_is_write_only(self):
        serializer = OrganizationSerializer()
        self.assertTrue(serializer.fields["registration_document"].write_only)


class VerifiedOrganizationDirectoryTests(APITestCase):
    def test_public_directory_returns_only_verified_active_organizations(self):
        verified_user = User.objects.create_user(
            email="verified-active@example.test",
            name="Verified Active",
            role=User.ROLE_NGO,
        )
        verified = Organization.objects.create(
            user=verified_user,
            name="Verified Active Organization",
            verification_status=Organization.VERIFICATION_VERIFIED,
        )
        pending_user = User.objects.create_user(
            email="pending-active@example.test",
            name="Pending Active",
            role=User.ROLE_NGO,
        )
        Organization.objects.create(user=pending_user, name="Pending Organization")
        inactive_user = User.objects.create_user(
            email="verified-inactive@example.test",
            name="Verified Inactive",
            role=User.ROLE_NGO,
            is_active=False,
        )
        Organization.objects.create(
            user=inactive_user,
            name="Inactive Organization",
            verification_status=Organization.VERIFICATION_VERIFIED,
        )

        response = self.client.get("/api/organizations/")

        self.assertEqual(response.status_code, 200, response.data)
        result = response.data["data"]
        rows = result["results"] if isinstance(result, dict) else result
        self.assertEqual([row["id"] for row in rows], [str(verified.id)])
