
from rest_framework.permissions import BasePermission, SAFE_METHODS


class HasRequiredModelPermission(BasePermission):
    """Authorize writes through Django's normal user/group permission system."""

    def has_permission(self, request, view):
        user = request.user
        if request.method in SAFE_METHODS:
            return True
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        permission = getattr(view, "required_permission", None)
        if callable(permission):
            permission = permission(request, view)
        return bool(permission and user.has_perm(permission))


class HasModelPermission(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        permission = getattr(view, "required_permission", None)
        if callable(permission):
            permission = permission(request, view)
        return bool(user and user.is_authenticated and (user.is_superuser or (permission and user.has_perm(permission))))


def is_business_owner(user):
    return bool(user and user.is_authenticated and (user.is_superuser or user.groups.filter(name="Business Owner").exists()))
