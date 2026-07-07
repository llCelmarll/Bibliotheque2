from sqlmodel import SQLModel
from app.models.user_push_token_model import UserPushToken
from app.models.rate_limit_attempt_model import RateLimitAttempt
from app.models.author_model import Author
from app.models.book_model import Book
from app.models.publisher_model import Publisher
from app.models.genre_model import Genre
from app.models.series_model import Series
from app.models.contact_model import Contact
from app.models.loan_model import Loan
from app.models.borrowed_book_model import BorrowedBook
from app.models.book_author_link_model import BookAuthorLink
from app.models.book_genre_link_model import BookGenreLink
from app.models.book_series_link_model import BookSeriesLink
from app.models.report_model import Report
from app.models.audit_log_model import AuditLog
from app.models.whitelist_entry_model import WhitelistEntry
from app.models.waitlist_entry_model import WaitlistEntry
from sqlmodel import create_engine, Session
import os
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger("db_init")

# Configuration de la base de données PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

logger.info(f"[DB INIT] Connexion à la base de données...")

# Configuration du pool de connexions pour PostgreSQL
engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800
)


# Create the database and tables
def init_db():
    SQLModel.metadata.create_all(engine)

# Dependency to get DB session
def get_session():
    with Session(engine) as session:
        yield session
