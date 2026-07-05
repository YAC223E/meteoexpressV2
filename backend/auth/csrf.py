from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from backend.config import AUTH_SECRET_KEY

_csrf_serializer = URLSafeTimedSerializer(AUTH_SECRET_KEY, salt="csrf-token")


def generate_csrf() -> str:
    return _csrf_serializer.dumps("csrf")


def validate_csrf(token: str) -> bool:
    if not token:
        return False
    try:
        _csrf_serializer.loads(token, max_age=3600)
        return True
    except (BadSignature, SignatureExpired):
        return False
