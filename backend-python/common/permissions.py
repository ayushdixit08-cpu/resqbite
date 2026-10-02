from rest_framework.permissions import BasePermission


class HasRole(BasePermission):
    allowed_roles = ()

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in self.allowed_roles
        )


class IsAdminUserRole(HasRole):
    allowed_roles = ("ADMIN",)


class IsDonor(HasRole):
    allowed_roles = ("DONOR",)


class IsNGO(HasRole):
    allowed_roles = ("NGO",)


class IsVolunteer(HasRole):
    allowed_roles = ("VOLUNTEER",)
