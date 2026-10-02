from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import ResQBitePagination
from common.responses import success_response

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        notifications = Notification.objects.filter(recipient=request.user)
        paginator = ResQBitePagination()
        page = paginator.paginate_queryset(notifications, request, view=self)
        if page is not None:
            return paginator.get_paginated_response(NotificationSerializer(page, many=True).data)
        return success_response(NotificationSerializer(notifications, many=True).data)


class NotificationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, notification_id):
        notification = Notification.objects.filter(pk=notification_id).first()
        if notification is None:
            return Response({"detail": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)
        if notification.recipient_id != request.user.id:
            raise PermissionDenied()
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return success_response(NotificationSerializer(notification).data, "Notification marked as read.")


class NotificationReadAllView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        updated = Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return success_response({"updated_count": updated}, "Notifications marked as read.")
