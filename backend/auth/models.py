import sqlite3
import os
from pathlib import Path
from werkzeug.security import generate_password_hash, check_password_hash

_DB_PATH: str | None = None


def _get_db_path() -> str:
    global _DB_PATH
    if _DB_PATH is None:
        db_dir = Path(__file__).resolve().parent.parent.parent / "instance"
        db_dir.mkdir(parents=True, exist_ok=True)
        _DB_PATH = str(db_dir / "meteoexpress.db")
    return _DB_PATH


def get_db() -> sqlite3.Connection:
    db = sqlite3.connect(_get_db_path())
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA foreign_keys=ON")
    return db


def init_db():
    db = get_db()
    db.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            email         TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS user_profiles (
            id                    INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id               INTEGER UNIQUE NOT NULL,
            age                   INTEGER,
            occupation            TEXT,
            allergies             TEXT,
            chronic_conditions    TEXT,
            email_alerts_enabled  INTEGER DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """)
    db.commit()
    db.close()


class User:
    def __init__(self, row: sqlite3.Row | None):
        if row is None:
            self.id = None
            self.email = ""
            self.password_hash = ""
            self.created_at = ""
        else:
            self.id = row["id"]
            self.email = row["email"]
            self.password_hash = row["password_hash"]
            self.created_at = row["created_at"]

    @staticmethod
    def create(email: str, password: str) -> int | None:
        db = get_db()
        try:
            cur = db.execute(
                "INSERT INTO users (email, password_hash) VALUES (?, ?)",
                (email.lower().strip(), generate_password_hash(password)),
            )
            db.commit()
            return cur.lastrowid
        except sqlite3.IntegrityError:
            return None
        finally:
            db.close()

    @staticmethod
    def find_by_email(email: str):
        db = get_db()
        row = db.execute(
            "SELECT * FROM users WHERE email = ?", (email.lower().strip(),)
        ).fetchone()
        db.close()
        return User(row)

    @staticmethod
    def find_by_id(user_id: int):
        db = get_db()
        row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        db.close()
        return User(row)

    def verify_password(self, password: str) -> bool:
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)


class UserProfile:
    def __init__(self, row: sqlite3.Row | None):
        if row is None:
            self.id = None
            self.user_id = None
            self.age = None
            self.occupation = None
            self.allergies = None
            self.chronic_conditions = None
            self.email_alerts_enabled = True
        else:
            self.id = row["id"]
            self.user_id = row["user_id"]
            self.age = row["age"]
            self.occupation = row["occupation"]
            self.allergies = row["allergies"]
            self.chronic_conditions = row["chronic_conditions"]
            self.email_alerts_enabled = bool(row["email_alerts_enabled"])

    @staticmethod
    def find_by_user_id(user_id: int):
        db = get_db()
        row = db.execute(
            "SELECT * FROM user_profiles WHERE user_id = ?", (user_id,)
        ).fetchone()
        db.close()
        return UserProfile(row)

    @staticmethod
    def upsert(user_id: int, age: int | None, occupation: str | None,
               allergies: str | None, chronic_conditions: str | None,
               email_alerts_enabled: bool = True):
        db = get_db()
        db.execute("""
            INSERT INTO user_profiles (user_id, age, occupation, allergies, chronic_conditions, email_alerts_enabled)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                age=excluded.age, occupation=excluded.occupation,
                allergies=excluded.allergies, chronic_conditions=excluded.chronic_conditions,
                email_alerts_enabled=excluded.email_alerts_enabled
        """, (user_id, age, occupation, allergies, chronic_conditions,
              1 if email_alerts_enabled else 0))
        db.commit()
        db.close()

    @staticmethod
    def has_profile(user_id: int) -> bool:
        db = get_db()
        row = db.execute(
            "SELECT 1 FROM user_profiles WHERE user_id = ? AND (age IS NOT NULL OR occupation IS NOT NULL OR allergies IS NOT NULL OR chronic_conditions IS NOT NULL)",
            (user_id,)
        ).fetchone()
        db.close()
        return row is not None
