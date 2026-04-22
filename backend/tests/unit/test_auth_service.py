"""
Tests unitaires pour AuthService — validation, tokens, authentification, création d'utilisateur.
"""
import hashlib
import pytest
from datetime import timedelta
from unittest.mock import Mock, patch
from sqlmodel import Session

from app.services.auth_service import (
    AuthService,
    _is_legacy_sha256,
    hash_password,
    verify_password,
)
from app.models.User import User
from tests.conftest import create_test_user


# ---------------------------------------------------------------------------
# Validation (sans DB)
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestAuthServiceValidation:

    @pytest.fixture
    def svc(self):
        return AuthService(Mock(spec=Session))

    def test_validate_email_valid(self, svc):
        assert svc.validate_email("user@example.com") is True

    def test_validate_email_valid_subdomain(self, svc):
        assert svc.validate_email("user@mail.example.co.uk") is True

    def test_validate_email_no_at(self, svc):
        assert svc.validate_email("notanemail") is False

    def test_validate_email_no_domain(self, svc):
        assert svc.validate_email("user@") is False

    def test_validate_email_no_tld(self, svc):
        assert svc.validate_email("user@domain") is False

    def test_validate_password_too_short(self, svc):
        valid, msg = svc.validate_password("Ab1")
        assert valid is False
        assert "8" in msg

    def test_validate_password_no_uppercase(self, svc):
        valid, msg = svc.validate_password("nouppercase1")
        assert valid is False
        assert "majuscule" in msg

    def test_validate_password_no_lowercase(self, svc):
        valid, msg = svc.validate_password("NOLOWERCASE1")
        assert valid is False
        assert "minuscule" in msg

    def test_validate_password_no_digit(self, svc):
        valid, msg = svc.validate_password("NoDigitHere")
        assert valid is False
        assert "chiffre" in msg

    def test_validate_password_valid(self, svc):
        valid, msg = svc.validate_password("ValidPass1")
        assert valid is True
        assert msg == ""

    def test_is_legacy_sha256_true(self):
        legacy = hashlib.sha256(b"password").hexdigest()
        assert _is_legacy_sha256(legacy) is True

    def test_is_legacy_sha256_false_bcrypt(self):
        bcrypt_hash = hash_password("password")
        assert _is_legacy_sha256(bcrypt_hash) is False

    def test_hash_and_verify_password_roundtrip(self):
        pw = "MySecret1"
        hashed = hash_password(pw)
        assert verify_password(pw, hashed) is True
        assert verify_password("wrong", hashed) is False

    def test_verify_password_legacy_sha256(self):
        pw = "OldPassword1"
        legacy_hash = hashlib.sha256(pw.encode()).hexdigest()
        assert verify_password(pw, legacy_hash) is True
        assert verify_password("wrong", legacy_hash) is False


# ---------------------------------------------------------------------------
# Tokens JWT (sans DB)
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestAuthServiceTokens:

    @pytest.fixture
    def svc(self):
        return AuthService(Mock(spec=Session))

    def test_create_access_token_has_sub(self, svc):
        token = svc.create_access_token(data={"sub": "42"})
        payload = svc.verify_token(token)
        assert payload is not None
        assert payload["sub"] == "42"

    def test_create_access_token_custom_expiry(self, svc):
        token = svc.create_access_token(data={"sub": "1"}, expires_delta=timedelta(hours=1))
        payload = svc.verify_token(token)
        assert payload is not None

    def test_verify_token_expired(self, svc):
        token = svc.create_access_token(data={"sub": "1"}, expires_delta=timedelta(seconds=-1))
        assert svc.verify_token(token) is None

    def test_verify_token_invalid_string(self, svc):
        assert svc.verify_token("notavalidtoken") is None

    def test_verify_token_rejects_refresh_token(self, svc):
        refresh = svc.create_refresh_token(data={"sub": "1"})
        assert svc.verify_token(refresh) is None

    def test_create_refresh_token_has_type(self, svc):
        token = svc.create_refresh_token(data={"sub": "5"})
        payload = svc.verify_refresh_token(token)
        assert payload is not None
        assert payload.get("type") == "refresh"

    def test_verify_refresh_token_valid(self, svc):
        token = svc.create_refresh_token(data={"sub": "7"})
        payload = svc.verify_refresh_token(token)
        assert payload["sub"] == "7"

    def test_verify_refresh_token_rejects_access_token(self, svc):
        access = svc.create_access_token(data={"sub": "1"})
        assert svc.verify_refresh_token(access) is None

    def test_verify_refresh_token_invalid_string(self, svc):
        assert svc.verify_refresh_token("garbage") is None


# ---------------------------------------------------------------------------
# generate_tokens / renew_access_token (sans DB)
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestAuthServiceGenerateTokens:

    @pytest.fixture
    def svc(self):
        return AuthService(Mock(spec=Session))

    def test_generate_tokens_remember_me_false(self, svc):
        result = svc.generate_tokens("99", remember_me=False)
        assert "access_token" in result
        assert "refresh_token" in result
        # refresh non-remember = 1 day
        payload = svc.verify_refresh_token(result["refresh_token"])
        assert payload is not None

    def test_generate_tokens_remember_me_true(self, svc):
        result = svc.generate_tokens("99", remember_me=True)
        # Both tokens should be valid and access token should have longer expiry
        assert svc.verify_token(result["access_token"]) is not None
        assert svc.verify_refresh_token(result["refresh_token"]) is not None

    def test_renew_access_token_valid_refresh(self, svc):
        refresh = svc.create_refresh_token(data={"sub": "42"})
        result = svc.renew_access_token(refresh)
        assert "access_token" in result
        payload = svc.verify_token(result["access_token"])
        assert payload["sub"] == "42"

    def test_renew_access_token_invalid_raises_401(self, svc):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            svc.renew_access_token("badtoken")
        assert exc.value.status_code == 401


# ---------------------------------------------------------------------------
# authenticate_user (avec DB SQLite réelle)
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestAuthServiceAuthenticate:

    def test_authenticate_user_not_found(self, session):
        svc = AuthService(session)
        result = svc.authenticate_user("unknown@example.com", "password")
        assert result is None

    def test_authenticate_user_inactive(self, session):
        create_test_user(session, email="inactive@example.com", username="inactive", is_active=False)
        svc = AuthService(session)
        result = svc.authenticate_user("inactive@example.com", "testpassword123")
        assert result is None

    def test_authenticate_user_bcrypt_correct(self, session):
        create_test_user(session, email="bcrypt@example.com", username="bcryptuser")
        svc = AuthService(session)
        result = svc.authenticate_user("bcrypt@example.com", "testpassword123")
        assert result is not None
        assert result.email == "bcrypt@example.com"

    def test_authenticate_user_bcrypt_wrong_password(self, session):
        create_test_user(session, email="bcrypt2@example.com", username="bcryptuser2")
        svc = AuthService(session)
        result = svc.authenticate_user("bcrypt2@example.com", "wrongpassword")
        assert result is None

    def test_authenticate_user_legacy_sha256_upgrades_to_bcrypt(self, session):
        password = "OldSecret1"
        legacy_hash = hashlib.sha256(password.encode()).hexdigest()
        user = User(
            email="legacy@example.com",
            username="legacyuser",
            hashed_password=legacy_hash,
            is_active=True,
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        svc = AuthService(session)
        result = svc.authenticate_user("legacy@example.com", password)
        assert result is not None
        # Hash should have been upgraded to bcrypt
        assert not _is_legacy_sha256(result.hashed_password)


# ---------------------------------------------------------------------------
# get_user_from_token (avec DB)
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestAuthServiceGetUserFromToken:

    def test_get_user_from_token_valid(self, session):
        user = create_test_user(session, email="tokenuser@example.com", username="tokenuser")
        svc = AuthService(session)
        token = svc.create_access_token(data={"sub": str(user.id)})
        found = svc.get_user_from_token(token)
        assert found is not None
        assert found.id == user.id

    def test_get_user_from_token_invalid_token(self, session):
        svc = AuthService(session)
        assert svc.get_user_from_token("not.a.token") is None

    def test_get_user_from_token_no_sub(self, session):
        svc = AuthService(session)
        token = svc.create_access_token(data={"other": "data"})
        assert svc.get_user_from_token(token) is None

    def test_get_user_from_token_refresh_rejected(self, session):
        svc = AuthService(session)
        refresh = svc.create_refresh_token(data={"sub": "1"})
        assert svc.get_user_from_token(refresh) is None


# ---------------------------------------------------------------------------
# create_user (avec DB, async)
# ---------------------------------------------------------------------------

@pytest.mark.unit
@pytest.mark.asyncio
class TestAuthServiceCreateUser:

    @pytest.fixture
    def svc(self, session):
        return AuthService(session)

    async def test_create_user_invalid_email_raises_400(self, svc):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            await svc.create_user("notanemail", "user", "ValidPass1")
        assert exc.value.status_code == 400

    async def test_create_user_not_in_whitelist_raises_403(self, svc):
        from fastapi import HTTPException
        with patch("app.services.auth_service.is_email_allowed", return_value=False):
            with pytest.raises(HTTPException) as exc:
                await svc.create_user("blocked@other.com", "user", "ValidPass1")
        assert exc.value.status_code == 403

    async def test_create_user_duplicate_email_raises_400(self, svc, session):
        from fastapi import HTTPException
        create_test_user(session, email="test@example.com", username="firstuser")
        with pytest.raises(HTTPException) as exc:
            await svc.create_user("test@example.com", "seconduser", "ValidPass1")
        assert exc.value.status_code == 400

    async def test_create_user_password_too_short_raises_400(self, svc):
        from fastapi import HTTPException
        with patch("app.services.auth_service.is_email_allowed", return_value=True):
            with pytest.raises(HTTPException) as exc:
                await svc.create_user("new@example.com", "newuser", "Ab1")
        assert exc.value.status_code == 400

    async def test_create_user_password_no_uppercase_raises_400(self, svc):
        from fastapi import HTTPException
        with patch("app.services.auth_service.is_email_allowed", return_value=True):
            with pytest.raises(HTTPException) as exc:
                await svc.create_user("new@example.com", "newuser", "alllower1")
        assert exc.value.status_code == 400

    async def test_create_user_password_no_digit_raises_400(self, svc):
        from fastapi import HTTPException
        with patch("app.services.auth_service.is_email_allowed", return_value=True):
            with pytest.raises(HTTPException) as exc:
                await svc.create_user("new@example.com", "newuser", "NoDigitHere")
        assert exc.value.status_code == 400

    async def test_create_user_username_too_short_raises_400(self, svc):
        from fastapi import HTTPException
        with patch("app.services.auth_service.is_email_allowed", return_value=True):
            with pytest.raises(HTTPException) as exc:
                await svc.create_user("new@example.com", "ab", "ValidPass1")
        assert exc.value.status_code == 400

    async def test_create_user_username_invalid_chars_raises_400(self, svc):
        from fastapi import HTTPException
        with patch("app.services.auth_service.is_email_allowed", return_value=True):
            with pytest.raises(HTTPException) as exc:
                await svc.create_user("new@example.com", "user!@#", "ValidPass1")
        assert exc.value.status_code == 400

    async def test_create_user_success_returns_user(self, svc):
        with patch("app.services.auth_service.is_email_allowed", return_value=True):
            user = await svc.create_user("newuser@example.com", "newuser", "ValidPass1")
        assert user.email == "newuser@example.com"
        assert user.username == "newuser"
        assert user.is_active is True

    async def test_create_user_success_persisted_in_db(self, svc, session):
        from sqlmodel import select
        with patch("app.services.auth_service.is_email_allowed", return_value=True):
            user = await svc.create_user("persisted@example.com", "persisteduser", "ValidPass1")
        found = session.exec(select(User).where(User.id == user.id)).first()
        assert found is not None
        assert found.email == "persisted@example.com"
