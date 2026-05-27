from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlmodel import Session, select, delete
from app.models.RateLimitAttempt import RateLimitAttempt


class RateLimiter:
    """
    Rate limiter persistant via PostgreSQL.
    Résiste aux redémarrages du backend contrairement à une implémentation en mémoire.
    """

    def _cutoff(self, window_minutes: int) -> datetime:
        return datetime.utcnow() - timedelta(minutes=window_minutes)

    def _count_recent(self, session: Session, ip: str, endpoint: str, window_minutes: int) -> int:
        cutoff = self._cutoff(window_minutes)
        result = session.exec(
            select(RateLimitAttempt).where(
                RateLimitAttempt.ip == ip,
                RateLimitAttempt.endpoint == endpoint,
                RateLimitAttempt.attempted_at > cutoff,
            )
        ).all()
        return len(result)

    def check_and_record(
        self,
        ip: str,
        endpoint: str,
        max_attempts: int = 5,
        window_minutes: int = 15,
        session: Session = None,
    ):
        """
        Vérifie le rate limit et enregistre la tentative.
        Lève HTTPException 429 si la limite est atteinte.
        """
        if session is None:
            raise ValueError("session is required for persistent rate limiting")

        # Nettoyage des entrées expirées pour éviter la croissance infinie de la table
        cutoff = self._cutoff(window_minutes)
        session.exec(
            delete(RateLimitAttempt).where(
                RateLimitAttempt.endpoint == endpoint,
                RateLimitAttempt.attempted_at <= cutoff,
            )
        )

        count = self._count_recent(session, ip, endpoint, window_minutes)
        if count >= max_attempts:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Trop de tentatives. Veuillez réessayer dans {window_minutes} minutes.",
            )

        session.add(RateLimitAttempt(ip=ip, endpoint=endpoint))
        session.commit()

    def clear_attempts(self, ip: str, endpoint: str, session: Session = None):
        """Efface les tentatives après un succès (ex: login réussi)."""
        if session is None:
            return
        session.exec(
            delete(RateLimitAttempt).where(
                RateLimitAttempt.ip == ip,
                RateLimitAttempt.endpoint == endpoint,
            )
        )
        session.commit()


rate_limiter = RateLimiter()
