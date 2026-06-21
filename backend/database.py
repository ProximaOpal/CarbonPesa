import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

# Load .env from the backend directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost/carbonpesa"
)

# ── SQLite fallback for local Windows dev (no PostgreSQL required) ────────────
# If the configured URL is Postgres but psycopg2 isn't installed, we fall back
# to a local SQLite file so the server and tests can still run end-to-end.
USING_SQLITE = False

if _DATABASE_URL.startswith("postgresql"):
    try:
        import psycopg2  # noqa: F401
        import geoalchemy2  # noqa: F401
        DATABASE_URL = _DATABASE_URL
    except ImportError as e:
        _sqlite_path = os.path.join(os.path.dirname(__file__), "carbonpesa_dev.db")
        DATABASE_URL = f"sqlite:///{_sqlite_path}"
        USING_SQLITE = True
        print(f"[DB] {type(e).__name__}: {e} — using SQLite fallback: {_sqlite_path}")
else:
    DATABASE_URL = _DATABASE_URL

_engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **_engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

