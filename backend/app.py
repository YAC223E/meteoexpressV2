from flask import Flask, request

from backend.auth.models import init_db
from backend.auth.session import read_session
from backend.config import AUTH_SECRET_KEY
from backend.icon_map import register_icon_helpers

SESSION_COOKIE = "meteoexpress_session"


def create_app():
    init_db()

    app = Flask(
        __name__,
        template_folder='templates',
        static_folder='static'
    )
    app.secret_key = AUTH_SECRET_KEY

    from backend.routes.weather import weather_bp
    app.register_blueprint(weather_bp)

    from backend.routes.auth import auth_bp
    app.register_blueprint(auth_bp)

    @app.context_processor
    def inject_user():
        token = request.cookies.get(SESSION_COOKIE)
        user = read_session(token)
        return dict(user=user)

    # Register icon helpers (filters + globals) for Jinja templates —
    # presentation layer only; keys resolve via backend/icon_map.py.
    register_icon_helpers(app)

    return app


if __name__ == "__main__":
    create_app().run(debug=True, host="0.0.0.0", port=5000)
