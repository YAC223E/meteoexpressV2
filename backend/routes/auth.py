from flask import Blueprint, render_template, request, redirect, url_for
from markupsafe import escape

from backend.auth.models import User, UserProfile
from backend.auth.session import create_session, read_session, clear_session
from backend.auth.csrf import generate_csrf, validate_csrf

auth_bp = Blueprint("auth", __name__)

SESSION_COOKIE = "meteoexpress_session"
CSRF_COOKIE = "meteoexpress_csrf"


def _get_user():
    token = request.cookies.get(SESSION_COOKIE)
    return read_session(token)


def _set_session_cookie(response, user_id, email):
    session_token = create_session(user_id, email)
    response.set_cookie(
        SESSION_COOKIE, session_token,
        max_age=86400 * 7, httponly=True, samesite="lax",
    )


def _clear_session_cookie(response):
    response.delete_cookie(SESSION_COOKIE, path="/")


def _make_csrf_response(template_name, **extra):
    csrf = generate_csrf()
    resp = render_template(template_name, csrf_token=csrf, **extra)
    response = make_response(resp)
    response.set_cookie(CSRF_COOKIE, csrf, max_age=3600, httponly=True, samesite="lax")
    return response


from flask import make_response


# ─── Sign Up ────────────────────────────────────────────────────────────

@auth_bp.route("/signup", methods=["GET", "POST"])
def signup():
    if _get_user():
        return redirect("/")

    if request.method == "GET":
        csrf = generate_csrf()
        r = make_response(render_template("auth/signup.html", error=None, csrf_token=csrf, form_data={}))
        r.set_cookie(CSRF_COOKIE, csrf, max_age=3600, httponly=True, samesite="lax")
        return r

    # POST
    email = (request.form.get("email") or "").strip()
    password = request.form.get("password") or ""
    confirm = request.form.get("confirm_password") or ""

    if not validate_csrf(request.form.get("csrf_token", "")):
        return redirect("/signup?error=Session+expired,+please+try+again")

    if not email or not password:
        return redirect("/signup?error=Email+and+password+are+required")
    if password != confirm:
        return redirect("/signup?error=Passwords+do+not+match")
    if len(password) < 6:
        return redirect("/signup?error=Password+must+be+at+least+6+characters")
    if "@" not in email:
        return redirect("/signup?error=Invalid+email+address")

    user_id = User.create(email, password)
    if user_id is None:
        return redirect("/signup?error=Email+already+registered")

    resp = redirect("/onboarding")
    _set_session_cookie(resp, user_id, email)
    return resp


# ─── Log In ─────────────────────────────────────────────────────────────

@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if _get_user():
        return redirect("/")

    if request.method == "GET":
        error = request.args.get("error")
        csrf = generate_csrf()
        r = make_response(render_template("auth/login.html", error=error, csrf_token=csrf, form_data={}))
        r.set_cookie(CSRF_COOKIE, csrf, max_age=3600, httponly=True, samesite="lax")
        return r

    # POST
    email = (request.form.get("email") or "").strip()
    password = request.form.get("password") or ""

    if not validate_csrf(request.form.get("csrf_token", "")):
        return redirect("/login?error=Session+expired,+please+try+again")

    if not email or not password:
        return redirect("/login?error=Email+and+password+are+required")

    user = User.find_by_email(email)
    if not user.id or not user.verify_password(password):
        return redirect("/login?error=Invalid+email+or+password")

    resp = redirect("/")
    _set_session_cookie(resp, user.id, user.email)
    return resp


# ─── Log Out ────────────────────────────────────────────────────────────

@auth_bp.route("/logout")
def logout():
    resp = redirect("/")
    _clear_session_cookie(resp)
    return resp


# ─── Onboarding ─────────────────────────────────────────────────────────

@auth_bp.route("/onboarding", methods=["GET", "POST"])
def onboarding():
    user = _get_user()
    if not user:
        return redirect("/login?error=Please+log+in+first")

    # GET
    if request.method == "GET":
        if UserProfile.has_profile(user["user_id"]):
            return redirect("/profile")
        error = request.args.get("error")
        csrf = generate_csrf()
        r = make_response(render_template("auth/onboarding.html", error=error, csrf_token=csrf, user=user))
        r.set_cookie(CSRF_COOKIE, csrf, max_age=3600, httponly=True, samesite="lax")
        return r

    # POST
    if request.form.get("skip") == "1":
        return redirect("/")

    if not validate_csrf(request.form.get("csrf_token", "")):
        return redirect("/onboarding?error=Session+expired,+please+try+again")

    age_str = (request.form.get("age") or "").strip()
    age = int(age_str) if age_str.isdigit() else None
    occupation = (request.form.get("occupation") or "").strip() or None
    allergies = (request.form.get("allergies") or "").strip() or None
    chronic = (request.form.get("chronic_conditions") or "").strip() or None

    UserProfile.upsert(user["user_id"], age, occupation, allergies, chronic, email_alerts_enabled=True)
    return redirect("/profile?onboarded=1")


# ─── Profile ────────────────────────────────────────────────────────────

@auth_bp.route("/profile", methods=["GET", "POST"])
def profile():
    user = _get_user()
    if not user:
        return redirect("/login?error=Please+log+in+first")

    if request.method == "GET":
        profile_obj = UserProfile.find_by_user_id(user["user_id"])
        error = request.args.get("error")
        onboarded = request.args.get("onboarded")
        csrf = generate_csrf()
        r = make_response(render_template(
            "auth/profile.html", user=user, profile=profile_obj,
            error=error, csrf_token=csrf, onboarded=onboarded
        ))
        r.set_cookie(CSRF_COOKIE, csrf, max_age=3600, httponly=True, samesite="lax")
        return r

    # POST
    if not validate_csrf(request.form.get("csrf_token", "")):
        return redirect("/profile?error=Session+expired,+please+try+again")

    age_str = (request.form.get("age") or "").strip()
    age = int(age_str) if age_str.isdigit() else None
    occupation = (request.form.get("occupation") or "").strip() or None
    allergies = (request.form.get("allergies") or "").strip() or None
    chronic = (request.form.get("chronic_conditions") or "").strip() or None
    alerts = request.form.get("email_alerts_enabled") == "1"

    UserProfile.upsert(user["user_id"], age, occupation, allergies, chronic, alerts)
    return redirect("/profile?saved=1")
