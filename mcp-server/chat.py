"""Chat module for farmOS AI assistant with OpenAI tool calling."""

import os
import json
import inspect
from typing import Any, Optional
from openai import OpenAI

# Import all tool functions from main module
from main import (
    get_api_info,
    get_schema,
    list_assets,
    get_asset,
    create_asset,
    update_asset,
    delete_asset,
    list_logs,
    get_log,
    create_log,
    create_harvest_log,
    update_log,
    list_locations,
    get_location,
    create_location,
    update_location,
    list_predicates,
    get_predicate,
    list_facts,
    get_fact,
    create_fact,
    list_quantities,
    create_quantity,
    move_asset,
    record_observation,
    get_farm_summary,
)

# OpenAI client (lazily initialized)
_client = None


def _get_client() -> OpenAI:
    """Get or create the OpenAI client."""
    global _client
    if _client is None:
        _client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _client


# For testing/mocking - when not None, this is used instead of _get_client()
client = None

# Tool names (functions are looked up dynamically to support testing/mocking)
TOOL_NAMES = [
    "get_api_info",
    "get_schema",
    "list_assets",
    "get_asset",
    "create_asset",
    "update_asset",
    "delete_asset",
    "list_logs",
    "get_log",
    "create_log",
    "create_harvest_log",
    "update_log",
    "list_locations",
    "get_location",
    "create_location",
    "update_location",
    "list_predicates",
    "get_predicate",
    "list_facts",
    "get_fact",
    "create_fact",
    "list_quantities",
    "create_quantity",
    "move_asset",
    "record_observation",
    "get_farm_summary",
]

# Import the module to look up functions dynamically
import sys
_current_module = sys.modules[__name__]


def _get_tool_function(name: str):
    """Get tool function by name, supporting mocking."""
    return getattr(_current_module, name)

# System prompt for the farm assistant
SYSTEM_PROMPT = """You are a helpful farm management assistant for farmOS. You help farmers manage their assets, locations, logs, and observations.

You have access to tools that allow you to:
- View and manage farm assets (animals, plants, equipment, etc.)
- View and manage farm locations
- Create and view activity logs
- Record observations and facts about assets
- Move assets between locations
- Get a summary of the farm

When answering questions:
- Be concise and helpful
- Use tools to get current data when needed
- Explain what you found in natural language
- If you need to perform multiple operations, do them in sequence

Always prioritize getting accurate, real-time data from the farm database over making assumptions."""


def _get_type_for_annotation(annotation) -> str:
    """Convert Python type annotation to JSON Schema type."""
    if annotation == int:
        return "integer"
    elif annotation == float:
        return "number"
    elif annotation == bool:
        return "boolean"
    elif annotation == str:
        return "string"
    elif annotation == list:
        return "array"
    elif annotation == dict:
        return "object"
    else:
        return "string"  # Default to string


def _function_to_openai_tool(name: str, func) -> dict:
    """Convert a Python function to OpenAI tool format."""
    sig = inspect.signature(func)
    doc = func.__doc__ or ""

    # Parse docstring for parameter descriptions
    param_descriptions = {}
    lines = doc.split("\n")
    in_args = False
    for line in lines:
        line = line.strip()
        if line.startswith("Args:"):
            in_args = True
            continue
        if in_args and line and ":" in line:
            param_name, desc = line.split(":", 1)
            param_descriptions[param_name.strip()] = desc.strip()
        elif in_args and not line:
            continue
        elif in_args and not ":" in line:
            in_args = False

    # Build parameters schema
    properties = {}
    required = []

    for param_name, param in sig.parameters.items():
        param_type = "string"
        if param.annotation != inspect.Parameter.empty:
            param_type = _get_type_for_annotation(param.annotation)

        prop_schema = {
            "type": param_type,
            "description": param_descriptions.get(param_name, "")
        }

        # OpenAI requires "items" for array types
        if param_type == "array":
            prop_schema["items"] = {"type": "object"}

        properties[param_name] = prop_schema

        # If no default value, it's required
        if param.default == inspect.Parameter.empty:
            required.append(param_name)

    # Get description from first line of docstring
    description = doc.split("\n")[0].strip() if doc else f"Execute {name}"

    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": {
                "type": "object",
                "properties": properties,
                "required": required
            }
        }
    }


def get_tool_definitions() -> list[dict]:
    """Get all tool definitions in OpenAI function calling format."""
    tools = []
    for name in TOOL_NAMES:
        func = _get_tool_function(name)
        tools.append(_function_to_openai_tool(name, func))
    return tools


def execute_tool(name: str, arguments: dict) -> Any:
    """Execute a tool by name with the given arguments.

    Args:
        name: The name of the tool to execute
        arguments: Dictionary of arguments to pass to the tool

    Returns:
        The result of the tool execution

    Raises:
        ValueError: If the tool name is not found
    """
    if name not in TOOL_NAMES:
        raise ValueError(f"Unknown tool: {name}")

    func = _get_tool_function(name)
    return func(**arguments)


async def chat(message: str, history: Optional[list[dict]] = None) -> dict:
    """Process a chat message and return a response.

    Args:
        message: The user's message
        history: Optional list of previous messages in the conversation

    Returns:
        A dict containing the response message and any tool calls made
    """
    # Build messages list
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    if history:
        messages.extend(history)

    messages.append({"role": "user", "content": message})

    # Get tool definitions
    tools = get_tool_definitions()

    # Track tool calls for response
    tool_calls_made = []

    # Get the OpenAI client (use mock if set, otherwise lazy-init real client)
    openai_client = client if client is not None else _get_client()

    # Loop to handle tool calls
    while True:
        # Call OpenAI
        response = openai_client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o"),
            messages=messages,
            tools=tools,
            tool_choice="auto"
        )

        assistant_message = response.choices[0].message
        finish_reason = response.choices[0].finish_reason

        # If no tool calls, return the response
        if not assistant_message.tool_calls or finish_reason == "stop":
            return {
                "message": assistant_message.content or "",
                "tool_calls": tool_calls_made
            }

        # Add assistant message to conversation
        messages.append({
            "role": "assistant",
            "content": assistant_message.content,
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments
                    }
                }
                for tc in assistant_message.tool_calls
            ]
        })

        # Execute each tool call
        for tool_call in assistant_message.tool_calls:
            tool_name = tool_call.function.name
            tool_args = json.loads(tool_call.function.arguments)

            try:
                result = execute_tool(tool_name, tool_args)
                tool_calls_made.append({
                    "name": tool_name,
                    "arguments": tool_args,
                    "result": result
                })
            except Exception as e:
                result = {"error": str(e)}
                tool_calls_made.append({
                    "name": tool_name,
                    "arguments": tool_args,
                    "error": str(e)
                })

            # Add tool result to messages
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps(result)
            })
