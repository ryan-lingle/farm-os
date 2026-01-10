"""Tests for the HTTP server endpoints."""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient


class TestChatEndpoint:
    """Tests for the /chat endpoint."""

    def test_chat_endpoint_returns_200(self):
        """POST /chat should return 200 for valid request."""
        from http_server import app

        client = TestClient(app)

        with patch("http_server.chat") as mock_chat:
            mock_chat.return_value = {"message": "Hello!", "tool_calls": []}

            response = client.post(
                "/chat",
                json={"message": "Hello"}
            )

            assert response.status_code == 200

    def test_chat_endpoint_returns_message(self):
        """Response should contain message field."""
        from http_server import app

        client = TestClient(app)

        with patch("http_server.chat") as mock_chat:
            mock_chat.return_value = {"message": "I can help with your farm.", "tool_calls": []}

            response = client.post(
                "/chat",
                json={"message": "What can you help me with?"}
            )

            data = response.json()
            assert "message" in data
            assert "farm" in data["message"].lower()

    def test_chat_endpoint_accepts_history(self):
        """Should accept conversation history in request."""
        from http_server import app

        client = TestClient(app)

        with patch("http_server.chat") as mock_chat:
            mock_chat.return_value = {"message": "Yes, I remember.", "tool_calls": []}

            history = [
                {"role": "user", "content": "My name is Ryan"},
                {"role": "assistant", "content": "Nice to meet you!"}
            ]

            response = client.post(
                "/chat",
                json={
                    "message": "Do you remember my name?",
                    "history": history
                }
            )

            assert response.status_code == 200
            # Verify history was passed to chat function
            mock_chat.assert_called_once()
            call_args = mock_chat.call_args
            assert call_args.kwargs.get("history") == history or call_args.args[1] == history

    def test_chat_endpoint_returns_tool_calls(self):
        """Response should include tool calls made."""
        from http_server import app

        client = TestClient(app)

        with patch("http_server.chat") as mock_chat:
            mock_chat.return_value = {
                "message": "You have 5 animals.",
                "tool_calls": [
                    {"name": "list_assets", "arguments": {"asset_type": "animal"}, "result": {"data": []}}
                ]
            }

            response = client.post(
                "/chat",
                json={"message": "How many animals do I have?"}
            )

            data = response.json()
            assert "tool_calls" in data
            assert len(data["tool_calls"]) == 1
            assert data["tool_calls"][0]["name"] == "list_assets"

    def test_chat_endpoint_handles_errors(self):
        """Should return 500 on internal errors."""
        from http_server import app

        client = TestClient(app)

        with patch("http_server.chat") as mock_chat:
            mock_chat.side_effect = Exception("OpenAI API error")

            response = client.post(
                "/chat",
                json={"message": "Hello"}
            )

            assert response.status_code == 500
            data = response.json()
            assert "error" in data

    def test_chat_endpoint_validates_request(self):
        """Should return 422 for invalid request body."""
        from http_server import app

        client = TestClient(app)

        # Missing required 'message' field
        response = client.post(
            "/chat",
            json={}
        )

        assert response.status_code == 422


class TestHealthEndpoint:
    """Tests for health check endpoint."""

    def test_health_endpoint_returns_200(self):
        """GET /health should return 200."""
        from http_server import app

        client = TestClient(app)
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


class TestCORSConfiguration:
    """Tests for CORS configuration."""

    def test_cors_allows_all_origins(self):
        """Should allow requests from any origin in development."""
        from http_server import app

        client = TestClient(app)

        with patch("http_server.chat") as mock_chat:
            mock_chat.return_value = {"message": "Hello!", "tool_calls": []}

            response = client.post(
                "/chat",
                json={"message": "Hello"},
                headers={"Origin": "http://localhost:8080"}
            )

            # CORS should be enabled
            assert response.status_code == 200
