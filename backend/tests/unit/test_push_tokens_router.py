"""
Tests d'intégration pour le router push_tokens — register, prefs, unregister.
"""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.UserPushToken import UserPushToken

VALID_TOKEN = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
VALID_TOKEN_2 = "ExponentPushToken[yyyyyyyyyyyyyyyyyyyyyy]"


@pytest.mark.unit
class TestPushTokensRegister:

    def test_register_invalid_token_returns_400(self, authenticated_client: TestClient):
        response = authenticated_client.post("/push-tokens", json={"token": "bad-token"})
        assert response.status_code == 400

    def test_register_new_token_returns_201(self, authenticated_client: TestClient):
        response = authenticated_client.post("/push-tokens", json={"token": VALID_TOKEN, "platform": "android"})
        assert response.status_code == 201
        assert response.json()["status"] == "ok"

    def test_register_new_token_persisted_in_db(self, authenticated_client: TestClient, session: Session, test_user):
        authenticated_client.post("/push-tokens", json={"token": VALID_TOKEN})
        token = session.exec(select(UserPushToken).where(UserPushToken.token == VALID_TOKEN)).first()
        assert token is not None
        assert token.user_id == test_user.id

    def test_register_existing_token_updates_user(self, authenticated_client: TestClient, session: Session, test_user):
        # Premier enregistrement
        authenticated_client.post("/push-tokens", json={"token": VALID_TOKEN})
        # Deuxième enregistrement (upsert)
        response = authenticated_client.post("/push-tokens", json={"token": VALID_TOKEN, "platform": "ios"})
        assert response.status_code == 201
        tokens = session.exec(select(UserPushToken).where(UserPushToken.token == VALID_TOKEN)).all()
        assert len(tokens) == 1
        assert tokens[0].platform == "ios"


@pytest.mark.unit
class TestPushTokensPrefs:

    def test_get_prefs_empty_returns_empty_dict(self, authenticated_client: TestClient):
        response = authenticated_client.get("/push-tokens/prefs")
        assert response.status_code == 200
        assert response.json()["prefs"] == {}

    def test_update_prefs_persisted(self, authenticated_client: TestClient, session: Session, test_user):
        prefs = {"loan_request": True, "contact_invitation": False}
        response = authenticated_client.put("/push-tokens/prefs", json={"prefs": prefs})
        assert response.status_code == 200
        session.refresh(test_user)
        assert test_user.push_prefs == prefs

    def test_get_prefs_after_update_returns_prefs(self, authenticated_client: TestClient):
        prefs = {"loan_request": False}
        authenticated_client.put("/push-tokens/prefs", json={"prefs": prefs})
        response = authenticated_client.get("/push-tokens/prefs")
        assert response.json()["prefs"] == prefs


@pytest.mark.unit
class TestPushTokensUnregister:

    def test_unregister_existing_token_returns_204(self, authenticated_client: TestClient, session: Session, test_user):
        token = UserPushToken(user_id=test_user.id, token=VALID_TOKEN)
        session.add(token)
        session.commit()
        response = authenticated_client.delete(f"/push-tokens/{VALID_TOKEN}")
        assert response.status_code == 204

    def test_unregister_existing_token_deleted_from_db(self, authenticated_client: TestClient, session: Session, test_user):
        token = UserPushToken(user_id=test_user.id, token=VALID_TOKEN)
        session.add(token)
        session.commit()
        authenticated_client.delete(f"/push-tokens/{VALID_TOKEN}")
        found = session.exec(select(UserPushToken).where(UserPushToken.token == VALID_TOKEN)).first()
        assert found is None

    def test_unregister_nonexistent_token_returns_204(self, authenticated_client: TestClient):
        # Silencieux si le token n'existe pas
        response = authenticated_client.delete(f"/push-tokens/{VALID_TOKEN}")
        assert response.status_code == 204
