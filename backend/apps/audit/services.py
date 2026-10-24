from .models import AuditEntry


def record_audit(*, action, summary, request=None, actor=None, target_type="", target_id="", details=None):
    if actor is None and request is not None and getattr(request.user, "is_authenticated", False):
        actor = request.user
    meta = getattr(request, "META", {}) if request is not None else {}
    ip_address = meta.get("REMOTE_ADDR") or None
    user_agent = (meta.get("HTTP_USER_AGENT") or "")[:300]
    return AuditEntry.objects.create(
        actor=actor, action=action[:80], summary=summary[:240],
        target_type=target_type[:80], target_id=str(target_id)[:100],
        details=details or {}, ip_address=ip_address, user_agent=user_agent,
    )
