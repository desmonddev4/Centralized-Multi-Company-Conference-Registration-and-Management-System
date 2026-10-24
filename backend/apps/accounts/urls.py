
from django.urls import path
from .views import LoginView, LogoutView, PasswordResetConfirmView, PasswordResetRequestView, PermissionListView, RoleDetailView, RoleListCreateView, SessionView, UserDetailView, UserListCreateView

urlpatterns = [
    path("session/", SessionView.as_view(), name="session"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("users/", UserListCreateView.as_view(), name="users"),
    path("users/<int:user_id>/", UserDetailView.as_view(), name="user-detail"),
    path("roles/", RoleListCreateView.as_view(), name="roles"),
    path("roles/<int:role_id>/", RoleDetailView.as_view(), name="role-detail"),
    path("permissions/", PermissionListView.as_view(), name="permissions"),
]
