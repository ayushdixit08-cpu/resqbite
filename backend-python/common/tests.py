from django.test import TestCase
from django.urls import reverse


class BackendHomeTests(TestCase):
    def test_root_redirects_to_api_documentation(self):
        response = self.client.get("/")

        self.assertRedirects(response, reverse("swagger-ui"), fetch_redirect_response=False)
