"""Chat module for farmOS AI assistant with OpenAI tool calling."""

import os
import json
import inspect
from typing import Any, Optional
from openai import OpenAI

# Maximum character length for tool results to prevent context overflow
MAX_TOOL_RESULT_LENGTH = 8000
MAX_HISTORY_MESSAGES = 20

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
    # Task tools
    list_tasks,
    get_task,
    create_task,
    update_task,
    delete_task,
    complete_task,
    get_my_tasks,
    get_overdue_tasks,
    get_blocked_tasks,
    move_task_to_plan,
    schedule_task_to_cycle,
    # Plan tools
    list_plans,
    get_plan,
    get_plan_children,
    create_plan,
    update_plan,
    delete_plan,
    # Cycle tools
    list_cycles,
    get_cycle,
    get_current_cycle,
    create_cycle,
    generate_cycles,
    update_cycle,
    delete_cycle,
    # Task relation tools
    add_task_blocker,
    remove_task_blocker,
    get_task_blockers,
    get_tasks_blocked_by,
    add_related_task,
    mark_task_duplicate,
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
    # Task tools
    "list_tasks",
    "get_task",
    "create_task",
    "update_task",
    "delete_task",
    "complete_task",
    "get_my_tasks",
    "get_overdue_tasks",
    "get_blocked_tasks",
    "move_task_to_plan",
    "schedule_task_to_cycle",
    # Plan tools
    "list_plans",
    "get_plan",
    "get_plan_children",
    "create_plan",
    "update_plan",
    "delete_plan",
    # Cycle tools
    "list_cycles",
    "get_cycle",
    "get_current_cycle",
    "create_cycle",
    "generate_cycles",
    "update_cycle",
    "delete_cycle",
    # Task relation tools
    "add_task_blocker",
    "remove_task_blocker",
    "get_task_blockers",
    "get_tasks_blocked_by",
    "add_related_task",
    "mark_task_duplicate",
]

# Import the module to look up functions dynamically
import sys
_current_module = sys.modules[__name__]


def _get_tool_function(name: str):
    """Get tool function by name, supporting mocking."""
    return getattr(_current_module, name)

# System prompt for the farm assistant
SYSTEM_PROMPT = """You are a helpful farm management assistant for farmOS. You help farmers manage their assets, locations, logs, observations, and tasks.

You have access to tools that allow you to:
- View and manage farm assets (animals, plants, equipment, etc.)
- View and manage farm locations
- Create and view activity logs
- Record observations and facts about assets
- Move assets between locations
- Get a summary of the farm

Task Management:
- Create, update, and complete tasks (every task belongs to a plan)
- Organize tasks into plans - plans are recursive (plans can contain other plans)
- Schedule tasks into cycles (time periods like sprints or weeks)
- Track task dependencies (blockers) and related tasks
- View overdue tasks, blocked tasks, and active work
- Link tasks to specific assets or locations

When answering questions:
- Be concise and helpful
- Use tools to get current data when needed
- Explain what you found in natural language
- If you need to perform multiple operations, do them in sequence
- For task management, proactively suggest organizing tasks into plans or scheduling them into cycles

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

    # Get description from first non-empty line of docstring
    description = f"Execute {name}"
    if doc:
        for line in doc.split("\n"):
            stripped = line.strip()
            if stripped:
                description = stripped
                break

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


def _truncate_result(result: Any, max_length: int = MAX_TOOL_RESULT_LENGTH) -> str:
    """Truncate a tool result to prevent context overflow.

    Args:
        result: The result to truncate
        max_length: Maximum character length

    Returns:
        JSON string of the result, truncated if necessary
    """
    result_str = json.dumps(result)
    if len(result_str) <= max_length:
        return result_str

    # Try to truncate intelligently for list results
    if isinstance(result, dict) and "data" in result:
        data = result.get("data", [])
        if isinstance(data, list) and len(data) > 5:
            # Keep only first 5 items and add a truncation note
            truncated = {
                **result,
                "data": data[:5],
                "_truncated": f"Showing 5 of {len(data)} items. Use more specific filters to see more."
            }
            return json.dumps(truncated)

    # Fallback: simple truncation with note
    truncated_str = result_str[:max_length - 100]
    return truncated_str + '... [TRUNCATED - result too large]"}'


async def chat(message: str, history: Optional[list[dict]] = None, context: Optional[dict] = None) -> dict:
    """Process a chat message and return a response.

    Args:
        message: The user's message
        history: Optional list of previous messages in the conversation
        context: Optional context about a resource being discussed (from "Chat About" feature)
                 Contains: type (task/plan/asset/location/log), id, and data (markdown)

    Returns:
        A dict containing the response message and any tool calls made
    """
    # Build system prompt, optionally including resource context
    system_content = SYSTEM_PROMPT
    if context:
        context_intro = f"\n\n---\n\n## Current Context\n\nThe user is asking about a specific {context['type']}. Here is the relevant information:\n\n{context['data']}\n\nUse this context to provide more relevant and specific answers. You can still use tools to get additional information if needed."
        system_content = SYSTEM_PROMPT + context_intro

    # Build messages list
    messages = [{"role": "system", "content": system_content}]

    if history:
        # Limit history to prevent context overflow
        recent_history = history[-MAX_HISTORY_MESSAGES:] if len(history) > MAX_HISTORY_MESSAGES else history
        messages.extend(recent_history)

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

            # Add tool result to messages (truncated to prevent context overflow)
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": _truncate_result(result)
            })
