from django.test import TestCase

from .serializers import OrganizationSerializer


class OrganizationSerializerTests(TestCase):
    def test_registration_document_is_write_only(self):
        serializer = OrganizationSerializer()
        self.assertTrue(serializer.fields["registration_document"].write_only)
