from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from backend.config import AUTH_SECRET_KEY

_serializer = URLSafeTimedSerializer(AUTH_SECRET_KEY, salt="auth-session")


def create_session(user_id: int, email: str) -> str:
    return _serializer.dumps({"user_id": user_id, "email": email})


def read_session(cookie: str | None) -> dict | None:
    if not cookie:
        return None
    try:
        return _serializer.loads(cookie, max_age=86400 * 7)
    except (BadSignature, SignatureExpired):
        return None


def clear_session() -> str:
    return ""
