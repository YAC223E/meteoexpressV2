#!/usr/bin/env python3
"""Run Météo Express Pro with Flask (Waitress / Gunicorn / Dev server).

Usage:
    python run.py              # development (Flask built-in, port 5000)
    python run.py --port 8080  # custom port
"""

import sys
from backend.app import create_app

if __name__ == "__main__":
    port = 5000
    if "--port" in sys.argv:
        idx = sys.argv.index("--port")
        if idx + 1 < len(sys.argv):
            port = int(sys.argv[idx + 1])

    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=port)
