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
    # DISABLED: AI drawing tools - failed experiment, keeping code for future reference
    # Client-side commands (not executed on server, passed to frontend)
    # "start_drawing",
    # "add_feature",
    # "select_feature",
    # "update_feature",
    # "delete_feature",
    # "clear_features",
    # "get_features",
]


def start_drawing(mode: str) -> dict:
    """Activate a drawing mode for the user to manually draw on the map.

    Use this tool when you want to let the user draw something themselves.
    After calling this, the user can click on the map to create features.

    Args:
        mode: Drawing mode - 'polygon', 'linestring', 'point', 'circle', 'select', or 'static'. Use 'polygon' for irregular areas, 'circle' for ponds/tanks (recommended for water features), 'linestring' for paths/boundaries, 'point' for markers, 'select' to let user edit existing features, 'static' to disable drawing.

    Returns:
        Confirmation that drawing mode was activated
    """
    valid_modes = ['polygon', 'linestring', 'point', 'circle', 'select', 'static']
    if mode not in valid_modes:
        return {"error": f"Invalid mode '{mode}'. Must be one of: {valid_modes}"}

    return {
        "status": "drawing_mode_activated",
        "mode": mode,
        "message": f"Drawing mode set to '{mode}'. User can now draw on the map."
    }


def add_feature(feature: dict, auto_select: bool = True, properties: dict = None) -> dict:
    """Add an EDITABLE GeoJSON feature to the map that the user can move, resize, and delete.

    Use this tool to create features on the map. The feature becomes a real drawing that
    the user can interact with - they can select it, drag it to move, and delete it.
    This is the PRIMARY tool for AI-created map suggestions.

    Args:
        feature: GeoJSON Feature object with type, geometry, and properties. Example: {"type": "Feature", "geometry": {"type": "Polygon", "coordinates": [[[-86.574, 39.806], [-86.573, 39.806], [-86.573, 39.805], [-86.574, 39.805], [-86.574, 39.806]]]}, "properties": {"name": "Pond 1"}}
        auto_select: Whether to automatically select the feature after adding (default: True). Keep this True so the user can immediately see and edit it.
        properties: Optional properties to merge into the feature (alternative to including in feature object)

    Returns:
        The feature with its assigned ID
    """
    import sys

    # If properties provided separately, merge into feature
    if properties:
        if 'properties' not in feature:
            feature['properties'] = {}
        feature['properties'].update(properties)

    print(f"[chat.py add_feature] Called with feature: {json.dumps(feature, indent=2)}", file=sys.stderr)
    print(f"[chat.py add_feature] auto_select: {auto_select}", file=sys.stderr)
    return {
        "status": "feature_added",
        "feature": feature,
        "auto_select": auto_select,
        "message": f"Added feature to the map{' and selected it for editing' if auto_select else ''}"
    }


def select_feature(feature_id: str) -> dict:
    """Select an existing feature on the map for editing.

    Use this when you want to highlight a specific feature for the user to review or edit.

    Args:
        feature_id: The ID of the feature to select (from the drawn features context)

    Returns:
        Confirmation of selection
    """
    return {
        "status": "feature_selected",
        "feature_id": feature_id,
        "message": f"Selected feature {feature_id} for editing"
    }


def update_feature(feature_id: str, properties: dict = None, geometry: dict = None) -> dict:
    """Update an existing feature's properties or geometry.

    Use this to modify features that are already drawn on the map.

    Args:
        feature_id: The ID of the feature to update
        properties: New properties to merge into the feature (optional). Example: {"name": "Updated name", "area_acres": 2.5}
        geometry: New geometry to replace the existing one (optional). Example: {"type": "Polygon", "coordinates": [...]}

    Returns:
        Confirmation of the update
    """
    if not properties and not geometry:
        return {"error": "Must provide either properties or geometry to update"}

    return {
        "status": "feature_updated",
        "feature_id": feature_id,
        "properties": properties,
        "geometry": geometry,
        "message": f"Updated feature {feature_id}"
    }


def delete_feature(feature_id: str) -> dict:
    """Delete a feature from the map.

    Use this to remove a specific feature that is no longer needed.

    Args:
        feature_id: The ID of the feature to delete

    Returns:
        Confirmation of deletion
    """
    return {
        "status": "feature_deleted",
        "feature_id": feature_id,
        "message": f"Deleted feature {feature_id}"
    }


def clear_features() -> dict:
    """Clear all drawn features from the map.

    Use this to remove all features and start fresh.

    Returns:
        Confirmation that features were cleared
    """
    return {
        "status": "features_cleared",
        "message": "All drawn features have been cleared from the map"
    }


def get_features() -> dict:
    """Get all currently drawn features on the map.

    Use this to see what features the user has drawn or that you have added.
    The features will be returned in the response with their IDs and geometries.

    Returns:
        Request to get features (actual features are injected by the client)
    """
    return {
        "status": "features_requested",
        "message": "Requesting current features from the map"
    }

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
            print(f"[chat.py] Returning response with {len(tool_calls_made)} tool calls", file=sys.stderr)
            for i, tc in enumerate(tool_calls_made):
                print(f"[chat.py] Tool call {i}: {tc['name']}", file=sys.stderr)
                if 'feature' in tc.get('arguments', {}):
                    print(f"[chat.py] Feature in arguments: {json.dumps(tc['arguments']['feature'], indent=2)}", file=sys.stderr)
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
            print(f"[chat.py] Executing tool: {tool_name}", file=sys.stderr)
            print(f"[chat.py] Tool arguments: {json.dumps(tool_args, indent=2)}", file=sys.stderr)

            try:
                result = execute_tool(tool_name, tool_args)
                print(f"[chat.py] Tool result: {json.dumps(result, indent=2) if isinstance(result, dict) else result}", file=sys.stderr)
                tool_calls_made.append({
                    "name": tool_name,
                    "arguments": tool_args,
                    "result": result
                })
            except Exception as e:
                print(f"[chat.py] Tool error: {e}", file=sys.stderr)
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
