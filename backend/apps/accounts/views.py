
from django.contrib.auth import authenticate, get_user_model, login, logout, password_validation
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.middleware.csrf import get_token
from django.conf import settings
from django.core.mail import send_mail
from django.contrib.auth.models import Group, Permission
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, BasePermission
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.core.permissions import is_business_owner
from apps.audit.services import record_audit

User = get_user_model()
MANAGED_APPS = ("companies", "events", "registrations", "payments", "checkin", "reporting", "audit")


def user_payload(user):
    return {
        "id": user.pk, "username": user.get_username(), "email": user.email,
        "full_name": user.get_full_name(), "is_active": user.is_active,
        "is_superuser": user.is_superuser,
        "permissions": sorted(user.get_all_permissions()),
        "groups": [{"id": group.pk, "name": group.name} for group in user.groups.order_by("name")],
    }


def validate_id_list(value, field):
    if not isinstance(value, list) or any(type(item) is not int for item in value):
        raise serializers.ValidationError({field: "Provide a list of numeric IDs."})
    return value


class OwnerOnly(BasePermission):
    def has_permission(self, request, view):
        return is_business_owner(request.user)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class SessionView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        return Response({
            "authenticated": request.user.is_authenticated,
            "user": user_payload(request.user) if request.user.is_authenticated else None,
            "csrf_token": get_token(request),
        })


class LoginInput(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(trim_whitespace=False, write_only=True)


class LoginThrottle(AnonRateThrottle):
    rate = "10/minute"


class PasswordResetThrottle(AnonRateThrottle):
    rate = "5/hour"


@method_decorator(csrf_protect, name="dispatch")
class PasswordResetRequestView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = ()
    throttle_classes = (PasswordResetThrottle,)

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        if len(email) > 254 or "@" not in email:
            raise serializers.ValidationError({"email": "Enter a valid email address."})
        candidates = User.objects.filter(email__iexact=email, is_active=True)
        for user in candidates:
            if not (user.is_staff or user.is_superuser or user.groups.exists()):
                continue
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            link = settings.FRONTEND_URL.rstrip("/") + "/password-reset?uid=" + uid + "&token=" + token
            try:
                send_mail("Reset your staff account password", f"Use this link within one hour to choose a new password:\n\n{link}\n\nIf you did not request this, you can ignore this email.", settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
            except Exception:
                import logging
                logging.getLogger(__name__).exception("Could not send staff password reset email")
        return Response({"detail": "If an active staff account uses that address, a reset link has been sent."})


@method_decorator(csrf_protect, name="dispatch")
class PasswordResetConfirmView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = ()
    throttle_classes = (PasswordResetThrottle,)

    def post(self, request):
        uid, token, password = (str(request.data.get(key, "")) for key in ("uid", "token", "password"))
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id, is_active=True)
        except Exception:
            raise serializers.ValidationError({"detail": "This password reset link is invalid or has expired."})
        if not (user.is_staff or user.is_superuser or user.groups.exists()) or not default_token_generator.check_token(user, token):
            raise serializers.ValidationError({"detail": "This password reset link is invalid or has expired."})
        try:
            password_validation.validate_password(password, user=user)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"password": list(error.messages)})
        user.set_password(password)
        user.save(update_fields=["password"])
        record_audit(action="auth.password_reset", summary="Staff password reset", actor=user, target_type="user", target_id=user.pk)
        return Response({"detail": "Your password has been updated. You can now sign in."})


@method_decorator(ensure_csrf_cookie, name="dispatch")
@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = ()
    throttle_classes = (LoginThrottle,)

    def post(self, request):
        serializer = LoginInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(request, username=serializer.validated_data["username"], password=serializer.validated_data["password"])
        if user is None or not user.is_active or not (user.is_staff or user.is_superuser or user.groups.exists()):
            record_audit(action="auth.login_failed", summary="Staff sign-in failed", request=request, details={"username": serializer.validated_data["username"][:150]})
            return Response({"detail": "The username or password is incorrect, or this account has no staff access."}, status=status.HTTP_400_BAD_REQUEST)
        login(request, user)
        record_audit(action="auth.login_succeeded", summary="Staff signed in", request=request, actor=user, target_type="user", target_id=user.pk)
        return Response({"authenticated": True, "user": user_payload(user), "csrf_token": get_token(request)})


class LogoutView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        user = request.user if request.user.is_authenticated else None
        logout(request)
        record_audit(action="auth.logout", summary="Staff signed out", request=request, actor=user, target_type="user", target_id=user.pk if user else "")
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserListCreateView(APIView):
    permission_classes = (OwnerOnly,)

    def get(self, request):
        return Response([user_payload(user) for user in User.objects.prefetch_related("groups").filter(is_superuser=False).order_by("username")])

    @transaction.atomic
    def post(self, request):
        username = str(request.data.get("username", "")).strip()
        email = str(request.data.get("email", "")).strip().lower()
        full_name = str(request.data.get("full_name", "")).strip()
        password = str(request.data.get("password", ""))
        group_ids = validate_id_list(request.data.get("groups", []), "groups")
        if not username or len(username) > 150:
            raise serializers.ValidationError({"username": "Enter a username (up to 150 characters)."})
        if not email:
            raise serializers.ValidationError({"email": "Email is required."})
        if not full_name:
            raise serializers.ValidationError({"full_name": "Enter the staff member’s full name."})
        if len(password) < 10:
            raise serializers.ValidationError({"password": "Use a password with at least 10 characters."})
        first_name, *last_name = full_name.split()
        candidate = User(username=username, email=email, first_name=first_name, last_name=" ".join(last_name))
        try:
            password_validation.validate_password(password, user=candidate)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"password": list(error.messages)})
        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError({"username": "That username is already in use."})
        groups = list(Group.objects.filter(pk__in=group_ids))
        if len(groups) != len(set(group_ids)):
            raise serializers.ValidationError({"groups": "One or more selected roles could not be found."})
        if not groups:
            raise serializers.ValidationError({"groups": "Assign at least one role to the new staff account."})
        user = User(username=username, email=email, first_name=first_name, last_name=" ".join(last_name), is_staff=True)
        user.set_password(password)
        user.save()
        user.groups.set(groups)
        record_audit(action="user.created", summary="Staff account created", request=request, target_type="user", target_id=user.pk, details={"roles": [group.name for group in groups]})
        return Response(user_payload(user), status=status.HTTP_201_CREATED)


class UserDetailView(APIView):
    permission_classes = (OwnerOnly,)

    @transaction.atomic
    def patch(self, request, user_id):
        user = User.objects.filter(pk=user_id, is_superuser=False).first()
        if not user:
            from rest_framework.exceptions import NotFound
            raise NotFound("Staff account not found.")
        if "email" in request.data:
            user.email = str(request.data["email"]).strip().lower()
        if "full_name" in request.data:
            names = str(request.data["full_name"]).strip().split()
            user.first_name = names[0] if names else ""
            user.last_name = " ".join(names[1:])
        if "is_active" in request.data:
            if type(request.data["is_active"]) is not bool:
                raise serializers.ValidationError({"is_active": "Provide true or false."})
            user.is_active = request.data["is_active"]
        if "groups" in request.data:
            ids = validate_id_list(request.data["groups"], "groups")
            groups = list(Group.objects.filter(pk__in=ids))
            if len(groups) != len(set(ids)):
                raise serializers.ValidationError({"groups": "One or more selected roles could not be found."})
            if not groups:
                raise serializers.ValidationError({"groups": "Assign at least one role to this staff account."})
            user.groups.set(groups)
        user.save()
        record_audit(action="user.updated", summary="Staff account access updated", request=request, target_type="user", target_id=user.pk, details={"active": user.is_active, "roles": list(user.groups.values_list("name", flat=True))})
        return Response(user_payload(user))


class RoleListCreateView(APIView):
    permission_classes = (OwnerOnly,)

    def get(self, request):
        return Response([self.payload(group) for group in Group.objects.prefetch_related("permissions").order_by("name")])

    def payload(self, group):
        return {"id": group.pk, "name": group.name, "permissions": list(group.permissions.filter(content_type__app_label__in=MANAGED_APPS).values_list("id", flat=True))}

    def save_permissions(self, group, permission_ids):
        permission_ids = validate_id_list(permission_ids, "permissions")
        permissions = list(Permission.objects.filter(pk__in=permission_ids, content_type__app_label__in=MANAGED_APPS))
        if len(permissions) != len(set(permission_ids)):
            raise serializers.ValidationError({"permissions": "Select permissions from the available system access list."})
        group.permissions.set(permissions)

    @transaction.atomic
    def post(self, request):
        name = str(request.data.get("name", "")).strip()
        permission_ids = validate_id_list(request.data.get("permissions", []), "permissions")
        if not name or name.lower() == "business owner":
            raise serializers.ValidationError({"name": "Enter a role name other than the protected Business Owner role."})
        if Group.objects.filter(name__iexact=name).exists():
            raise serializers.ValidationError({"name": "A role with that name already exists."})
        group = Group.objects.create(name=name)
        self.save_permissions(group, permission_ids)
        record_audit(action="role.created", summary="Staff role created", request=request, target_type="role", target_id=group.pk, details={"role": group.name, "permission_count": len(permission_ids)})
        return Response(self.payload(group), status=status.HTTP_201_CREATED)


class RoleDetailView(APIView):
    permission_classes = (OwnerOnly,)

    @transaction.atomic
    def patch(self, request, role_id):
        group = Group.objects.filter(pk=role_id).first()
        if not group:
            from rest_framework.exceptions import NotFound
            raise NotFound("Role not found.")
        if group.name == "Business Owner":
            raise serializers.ValidationError("The Business Owner role is protected.")
        if "name" in request.data:
            name = str(request.data["name"]).strip()
            if not name or name.lower() == "business owner" or Group.objects.exclude(pk=group.pk).filter(name__iexact=name).exists():
                raise serializers.ValidationError({"name": "Choose a unique non-empty role name."})
            group.name = name
            group.save(update_fields=["name"])
        if "permissions" in request.data:
            RoleListCreateView().save_permissions(group, request.data["permissions"])
        record_audit(action="role.updated", summary="Staff role permissions updated", request=request, target_type="role", target_id=group.pk, details={"role": group.name, "permission_count": group.permissions.count()})
        return Response(RoleListCreateView().payload(group))

    @transaction.atomic
    def delete(self, request, role_id):
        group = Group.objects.filter(pk=role_id).first()
        if not group:
            return Response(status=status.HTTP_204_NO_CONTENT)
        if group.name == "Business Owner":
            raise serializers.ValidationError("The Business Owner role is protected.")
        record_audit(action="role.deleted", summary="Staff role deleted", request=request, target_type="role", target_id=group.pk, details={"role": group.name})
        group.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PermissionListView(APIView):
    permission_classes = (OwnerOnly,)

    def get(self, request):
        permissions = Permission.objects.filter(content_type__app_label__in=MANAGED_APPS).select_related("content_type").order_by("content_type__app_label", "codename")
        return Response([{"id": p.pk, "app": p.content_type.app_label, "codename": p.codename, "name": p.name} for p in permissions])
