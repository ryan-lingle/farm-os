"""Tests for the chat module."""
import pytest
from unittest.mock import Mock, patch, MagicMock
import json


class TestToolConversion:
    """Tests for converting MCP tools to OpenAI format."""

    def test_convert_mcp_tools_to_openai_format(self):
        """Tools should convert to OpenAI function calling format."""
        from chat import get_tool_definitions

        tools = get_tool_definitions()

        # Should return a list
        assert isinstance(tools, list)
        assert len(tools) > 0

        # Each tool should have the correct structure
        for tool in tools:
            assert tool["type"] == "function"
            assert "function" in tool
            assert "name" in tool["function"]
            assert "description" in tool["function"]
            assert "parameters" in tool["function"]

    def test_tool_definitions_include_key_tools(self):
        """Should include key tools like get_farm_summary, list_assets, etc."""
        from chat import get_tool_definitions

        tools = get_tool_definitions()
        tool_names = [t["function"]["name"] for t in tools]

        # Key tools should be present
        assert "get_farm_summary" in tool_names
        assert "list_assets" in tool_names
        assert "create_asset" in tool_names
        assert "list_locations" in tool_names
        assert "move_asset" in tool_names

    def test_tool_parameters_have_correct_types(self):
        """Tool parameters should have correct JSON Schema types."""
        from chat import get_tool_definitions

        tools = get_tool_definitions()

        # Find list_assets tool
        list_assets = next(t for t in tools if t["function"]["name"] == "list_assets")
        params = list_assets["function"]["parameters"]

        assert params["type"] == "object"
        assert "properties" in params
        assert "asset_type" in params["properties"]


class TestToolExecution:
    """Tests for executing tools by name."""

    def test_execute_tool_by_name(self):
        """Should execute correct tool and return result."""
        from chat import execute_tool

        # Mock the actual tool function
        with patch("chat.get_farm_summary") as mock_tool:
            mock_tool.return_value = {"success": True, "summary": {}}

            result = execute_tool("get_farm_summary", {})

            mock_tool.assert_called_once()
            assert result["success"] is True

    def test_execute_tool_with_arguments(self):
        """Should pass arguments to tool function."""
        from chat import execute_tool

        with patch("chat.list_assets") as mock_tool:
            mock_tool.return_value = {"success": True, "data": []}

            result = execute_tool("list_assets", {"asset_type": "animal"})

            mock_tool.assert_called_once_with(asset_type="animal")

    def test_execute_unknown_tool_raises_error(self):
        """Should raise error for unknown tool."""
        from chat import execute_tool

        with pytest.raises(ValueError, match="Unknown tool"):
            execute_tool("nonexistent_tool", {})


class TestChatFunction:
    """Tests for the main chat function."""

    @pytest.mark.asyncio
    async def test_chat_without_tool_call(self):
        """Simple query should return text response."""
        from chat import chat

        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Hello! I can help you manage your farm."
        mock_response.choices[0].message.tool_calls = None
        mock_response.choices[0].finish_reason = "stop"

        with patch("chat.client") as mock_client:
            mock_client.chat.completions.create.return_value = mock_response

            result = await chat("Hello")

            assert "message" in result
            assert "Hello" in result["message"] or "help" in result["message"].lower()

    @pytest.mark.asyncio
    async def test_chat_with_tool_call(self):
        """Query requiring data should trigger tool and return result."""
        from chat import chat

        # First response with tool call
        mock_tool_call = MagicMock()
        mock_tool_call.id = "call_123"
        mock_tool_call.function.name = "get_farm_summary"
        mock_tool_call.function.arguments = "{}"

        mock_response_1 = MagicMock()
        mock_response_1.choices = [MagicMock()]
        mock_response_1.choices[0].message.content = None
        mock_response_1.choices[0].message.tool_calls = [mock_tool_call]
        mock_response_1.choices[0].finish_reason = "tool_calls"

        # Second response after tool execution
        mock_response_2 = MagicMock()
        mock_response_2.choices = [MagicMock()]
        mock_response_2.choices[0].message.content = "Your farm has 5 animals and 3 locations."
        mock_response_2.choices[0].message.tool_calls = None
        mock_response_2.choices[0].finish_reason = "stop"

        with patch("chat.client") as mock_client, \
             patch("chat.execute_tool") as mock_execute:
            mock_client.chat.completions.create.side_effect = [mock_response_1, mock_response_2]
            mock_execute.return_value = {"success": True, "summary": {"animal_count": 5}}

            result = await chat("What's on my farm?")

            # Should have called OpenAI twice (initial + after tool)
            assert mock_client.chat.completions.create.call_count == 2
            # Should have executed the tool
            mock_execute.assert_called_once_with("get_farm_summary", {})
            # Should return final message
            assert "message" in result

    @pytest.mark.asyncio
    async def test_chat_handles_multiple_tool_calls(self):
        """Should handle multiple tool calls in sequence."""
        from chat import chat

        # Response with multiple tool calls
        mock_tool_call_1 = MagicMock()
        mock_tool_call_1.id = "call_1"
        mock_tool_call_1.function.name = "list_assets"
        mock_tool_call_1.function.arguments = '{"asset_type": "animal"}'

        mock_tool_call_2 = MagicMock()
        mock_tool_call_2.id = "call_2"
        mock_tool_call_2.function.name = "list_locations"
        mock_tool_call_2.function.arguments = "{}"

        mock_response_1 = MagicMock()
        mock_response_1.choices = [MagicMock()]
        mock_response_1.choices[0].message.content = None
        mock_response_1.choices[0].message.tool_calls = [mock_tool_call_1, mock_tool_call_2]
        mock_response_1.choices[0].finish_reason = "tool_calls"

        mock_response_2 = MagicMock()
        mock_response_2.choices = [MagicMock()]
        mock_response_2.choices[0].message.content = "You have animals and locations."
        mock_response_2.choices[0].message.tool_calls = None
        mock_response_2.choices[0].finish_reason = "stop"

        with patch("chat.client") as mock_client, \
             patch("chat.execute_tool") as mock_execute:
            mock_client.chat.completions.create.side_effect = [mock_response_1, mock_response_2]
            mock_execute.return_value = {"success": True, "data": []}

            result = await chat("Show me animals and locations")

            # Should have executed both tools
            assert mock_execute.call_count == 2


class TestChatHistory:
    """Tests for chat history handling."""

    @pytest.mark.asyncio
    async def test_chat_includes_history(self):
        """Should include conversation history in API call."""
        from chat import chat

        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Yes, I remember."
        mock_response.choices[0].message.tool_calls = None
        mock_response.choices[0].finish_reason = "stop"

        history = [
            {"role": "user", "content": "My name is Ryan"},
            {"role": "assistant", "content": "Nice to meet you, Ryan!"}
        ]

        with patch("chat.client") as mock_client:
            mock_client.chat.completions.create.return_value = mock_response

            await chat("Do you remember my name?", history=history)

            # Check that history was included in the call
            call_args = mock_client.chat.completions.create.call_args
            messages = call_args.kwargs.get("messages", call_args.args[0] if call_args.args else [])

            # Should have system prompt + history + new message
            assert len(messages) >= 3
