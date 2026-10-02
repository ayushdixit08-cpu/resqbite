from django.shortcuts import render

# Create your views here.
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView


class AIServiceUnavailableView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        return self.unavailable()

    def get(self, request, *args, **kwargs):
        return self.unavailable()

    @staticmethod
    def unavailable():
        return Response(
            {
                "success": False,
                "message": "AI functionality is not configured for this deployment.",
                "errors": {"provider": "Configure an approved AI provider before using this endpoint."},
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
