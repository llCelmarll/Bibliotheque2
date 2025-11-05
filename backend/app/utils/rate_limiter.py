from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict, Tuple
from fastapi import HTTPException, status

class RateLimiter:
    """
    Rate limiter simple pour prévenir les attaques brute force.
    Limite le nombre de tentatives par IP sur une période donnée.
    """
    def __init__(self):
        # Format: {ip: [(timestamp, endpoint), ...]}
        self.attempts: Dict[str, list] = defaultdict(list)
        
    def is_rate_limited(
        self,
        ip: str,
        endpoint: str,
        max_attempts: int = 5,
        window_minutes: int = 15
    ) -> Tuple[bool, int]:
        """
        Vérifie si une IP est rate limitée.
        
        Args:
            ip: Adresse IP à vérifier
            endpoint: Endpoint concerné (login, register, etc.)
            max_attempts: Nombre maximum de tentatives
            window_minutes: Fenêtre de temps en minutes
            
        Returns:
            (is_limited, remaining_attempts)
        """
        now = datetime.utcnow()
        cutoff = now - timedelta(minutes=window_minutes)
        
        # Nettoyer les anciennes tentatives
        self.attempts[ip] = [
            (ts, ep) for ts, ep in self.attempts[ip]
            if ts > cutoff and ep == endpoint
        ]
        
        # Compter les tentatives récentes pour cet endpoint
        recent_attempts = len(self.attempts[ip])
        
        if recent_attempts >= max_attempts:
            return True, 0
        
        return False, max_attempts - recent_attempts
    
    def record_attempt(self, ip: str, endpoint: str):
        """Enregistrer une tentative"""
        self.attempts[ip].append((datetime.utcnow(), endpoint))
    
    def clear_attempts(self, ip: str, endpoint: str):
        """Effacer les tentatives (après succès)"""
        self.attempts[ip] = [
            (ts, ep) for ts, ep in self.attempts[ip]
            if ep != endpoint
        ]
    
    def check_and_record(
        self,
        ip: str,
        endpoint: str,
        max_attempts: int = 5,
        window_minutes: int = 15
    ):
        """
        Vérifie le rate limit et enregistre la tentative.
        Lève une HTTPException si rate limité.
        """
        is_limited, remaining = self.is_rate_limited(
            ip, endpoint, max_attempts, window_minutes
        )
        
        if is_limited:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Trop de tentatives. Veuillez réessayer dans {window_minutes} minutes."
            )
        
        self.record_attempt(ip, endpoint)
        return remaining

# Instance globale
rate_limiter = RateLimiter()
