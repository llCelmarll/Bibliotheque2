"""
Tests unitaires pour PushNotificationService — send, send_to_user, activation.
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch, call

from app.services.push_notification_service import PushNotificationService
from app.models.UserPushToken import UserPushToken
from tests.conftest import create_test_user


VALID_TOKEN = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
VALID_TOKEN_2 = "ExponentPushToken[yyyyyyyyyyyyyyyyyyyyyy]"


# ---------------------------------------------------------------------------
# Init / activation
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestPushNotificationServiceInit:

    def test_enabled_by_default(self):
        with patch.dict("os.environ", {"PUSH_NOTIFICATIONS_ENABLED": "true"}):
            svc = PushNotificationService()
        assert svc.enabled is True

    def test_disabled_when_false(self):
        with patch.dict("os.environ", {"PUSH_NOTIFICATIONS_ENABLED": "false"}):
            svc = PushNotificationService()
        assert svc.enabled is False

    def test_enabled_uppercase_true(self):
        with patch.dict("os.environ", {"PUSH_NOTIFICATIONS_ENABLED": "TRUE"}):
            svc = PushNotificationService()
        assert svc.enabled is True


# ---------------------------------------------------------------------------
# send()
# ---------------------------------------------------------------------------

@pytest.mark.unit
@pytest.mark.asyncio
class TestPushNotificationServiceSend:

    @pytest.fixture
    def mock_httpx(self):
        with patch("app.services.push_notification_service.httpx.AsyncClient") as mock_cls:
            mock_response = Mock()
            mock_response.json.return_value = {"data": {"status": "ok"}}
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_cls.return_value = mock_client
            yield mock_client

    @pytest.fixture
    def enabled_svc(self):
        svc = PushNotificationService()
        svc.enabled = True
        return svc

    async def test_disabled_skips_http(self, mock_httpx):
        svc = PushNotificationService()
        svc.enabled = False
        await svc.send(VALID_TOKEN, "title", "body")
        mock_httpx.post.assert_not_called()

    async def test_invalid_token_skips_http(self, mock_httpx, enabled_svc):
        await enabled_svc.send("bad-token-format", "title", "body")
        mock_httpx.post.assert_not_called()

    async def test_valid_token_calls_http(self, mock_httpx, enabled_svc):
        await enabled_svc.send(VALID_TOKEN, "My Title", "My Body")
        mock_httpx.post.assert_called_once()

    async def test_payload_without_data(self, mock_httpx, enabled_svc):
        await enabled_svc.send(VALID_TOKEN, "T", "B", data=None)
        _, kwargs = mock_httpx.post.call_args
        payload = kwargs["json"]
        assert "data" not in payload
        assert payload["to"] == VALID_TOKEN
        assert payload["title"] == "T"
        assert payload["body"] == "B"
        assert payload["sound"] == "default"

    async def test_payload_with_data(self, mock_httpx, enabled_svc):
        await enabled_svc.send(VALID_TOKEN, "T", "B", data={"key": "val"})
        _, kwargs = mock_httpx.post.call_args
        payload = kwargs["json"]
        assert payload["data"] == {"key": "val"}

    async def test_expo_error_response_no_exception(self, enabled_svc):
        with patch("app.services.push_notification_service.httpx.AsyncClient") as mock_cls:
            mock_response = Mock()
            mock_response.json.return_value = {"data": {"status": "error", "message": "DeviceNotRegistered"}}
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_cls.return_value = mock_client
            # Should not raise
            await enabled_svc.send(VALID_TOKEN, "T", "B")

    async def test_httpx_exception_not_propagated(self, enabled_svc):
        with patch("app.services.push_notification_service.httpx.AsyncClient") as mock_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(side_effect=Exception("network error"))
            mock_cls.return_value = mock_client
            # Should not raise
            await enabled_svc.send(VALID_TOKEN, "T", "B")

    async def test_content_type_header_set(self, mock_httpx, enabled_svc):
        await enabled_svc.send(VALID_TOKEN, "T", "B")
        _, kwargs = mock_httpx.post.call_args
        assert kwargs["headers"]["Content-Type"] == "application/json"


# ---------------------------------------------------------------------------
# send_to_user()
# ---------------------------------------------------------------------------

@pytest.mark.unit
@pytest.mark.asyncio
class TestPushNotificationServiceSendToUser:

    @pytest.fixture
    def enabled_svc(self):
        svc = PushNotificationService()
        svc.enabled = True
        return svc

    async def test_disabled_skips_send(self, session, test_user):
        svc = PushNotificationService()
        svc.enabled = False
        with patch.object(svc, "send", new_callable=AsyncMock) as mock_send:
            await svc.send_to_user(session, test_user.id, "T", "B")
        mock_send.assert_not_called()

    async def test_user_with_no_tokens_skips_send(self, session, test_user, enabled_svc):
        with patch.object(enabled_svc, "send", new_callable=AsyncMock) as mock_send:
            await enabled_svc.send_to_user(session, test_user.id, "T", "B")
        mock_send.assert_not_called()

    async def test_user_with_two_tokens_sends_twice(self, session, test_user, enabled_svc):
        token1 = UserPushToken(user_id=test_user.id, token=VALID_TOKEN)
        token2 = UserPushToken(user_id=test_user.id, token=VALID_TOKEN_2)
        session.add(token1)
        session.add(token2)
        session.commit()

        with patch.object(enabled_svc, "send", new_callable=AsyncMock) as mock_send:
            await enabled_svc.send_to_user(session, test_user.id, "T", "B")

        assert mock_send.call_count == 2

    async def test_pref_false_blocks_send(self, session, test_user, enabled_svc):
        test_user.push_prefs = {"loan_request": False}
        session.add(test_user)
        session.commit()

        token = UserPushToken(user_id=test_user.id, token=VALID_TOKEN)
        session.add(token)
        session.commit()

        with patch.object(enabled_svc, "send", new_callable=AsyncMock) as mock_send:
            await enabled_svc.send_to_user(session, test_user.id, "T", "B", data={"type": "loan_request"})

        mock_send.assert_not_called()

    async def test_pref_true_allows_send(self, session, test_user, enabled_svc):
        test_user.push_prefs = {"loan_request": True}
        session.add(test_user)
        session.commit()

        token = UserPushToken(user_id=test_user.id, token=VALID_TOKEN)
        session.add(token)
        session.commit()

        with patch.object(enabled_svc, "send", new_callable=AsyncMock) as mock_send:
            await enabled_svc.send_to_user(session, test_user.id, "T", "B", data={"type": "loan_request"})

        mock_send.assert_called_once()

    async def test_pref_none_allows_send(self, session, test_user, enabled_svc):
        test_user.push_prefs = None
        session.add(test_user)
        session.commit()

        token = UserPushToken(user_id=test_user.id, token=VALID_TOKEN)
        session.add(token)
        session.commit()

        with patch.object(enabled_svc, "send", new_callable=AsyncMock) as mock_send:
            await enabled_svc.send_to_user(session, test_user.id, "T", "B", data={"type": "loan_request"})

        mock_send.assert_called_once()

    async def test_send_to_user_exception_not_propagated(self, session, test_user, enabled_svc):
        # Faire crasher session.exec pour atteindre le bloc except de send_to_user
        with patch.object(session, "exec", side_effect=Exception("db error")):
            # Ne doit pas lever d'exception
            await enabled_svc.send_to_user(session, test_user.id, "T", "B")

    async def test_data_without_type_skips_pref_check(self, session, test_user, enabled_svc):
        token = UserPushToken(user_id=test_user.id, token=VALID_TOKEN)
        session.add(token)
        session.commit()

        with patch.object(enabled_svc, "send", new_callable=AsyncMock) as mock_send:
            await enabled_svc.send_to_user(session, test_user.id, "T", "B", data={"other": "stuff"})

        mock_send.assert_called_once()
