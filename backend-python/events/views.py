from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from common.pagination import ResQBitePagination
from common.responses import success_response

from .models import Event
from .serializers import EventSerializer


class EventListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        events = Event.objects.select_related("organizer")
        paginator = ResQBitePagination()
        page = paginator.paginate_queryset(events, request, view=self)
        if page is not None:
            return paginator.get_paginated_response(EventSerializer(page, many=True).data)
        return success_response(EventSerializer(events, many=True).data)

    def post(self, request):
        if request.user.role not in {User.ROLE_DONOR, User.ROLE_NGO, User.ROLE_ADMIN}:
            raise PermissionDenied("Only donors, NGOs, or admins can organize events.")
        serializer = EventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        event = serializer.save(organizer=request.user)
        return success_response(EventSerializer(event).data, "Event scheduled.", status.HTTP_201_CREATED)


class EventDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, event_id):
        event = Event.objects.filter(pk=event_id).first()
        if event is None:
            return Response({"detail": "Event not found."}, status=status.HTTP_404_NOT_FOUND)
        if event.organizer_id != request.user.id and request.user.role != User.ROLE_ADMIN:
            raise PermissionDenied()
        serializer = EventSerializer(event, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        event = serializer.save()
        return success_response(EventSerializer(event).data, "Event updated.")
