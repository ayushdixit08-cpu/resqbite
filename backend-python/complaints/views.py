from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from common.views import ResQBiteAPIView as APIView

from common.pagination import ResQBitePagination
from common.responses import success_response

from .models import Complaint
from .serializers import ComplaintSerializer


class ComplaintListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = Complaint.objects.select_related("reporter", "donation", "reported_user")
        if request.user.role != "ADMIN":
            queryset = queryset.filter(reporter=request.user)
        paginator = ResQBitePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        if page is not None:
            return paginator.get_paginated_response(ComplaintSerializer(page, many=True).data)
        return success_response(ComplaintSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = ComplaintSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        complaint = serializer.save(reporter=request.user)
        return success_response(ComplaintSerializer(complaint).data, "Complaint submitted.", status.HTTP_201_CREATED)


class ComplaintDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, complaint_id):
        if request.user.role != "ADMIN":
            raise PermissionDenied("Administrator role is required.")
        complaint = Complaint.objects.filter(pk=complaint_id).first()
        if complaint is None:
            return Response({"detail": "Complaint not found."}, status=status.HTTP_404_NOT_FOUND)
        allowed = {"status", "resolution_notes"}
        if set(request.data) - allowed:
            return Response({"detail": "Only status and resolution_notes can be changed."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = ComplaintSerializer(complaint, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        complaint = serializer.save()
        return success_response(ComplaintSerializer(complaint).data, "Complaint updated.")


class FraudAlertListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != "ADMIN":
            raise PermissionDenied("Administrator role is required.")
        from .models import FraudAlert

        alerts = FraudAlert.objects.select_related("user")
        return success_response(list(alerts.values("id", "user_id", "user__email", "rule", "details", "reviewed", "created_at")))
