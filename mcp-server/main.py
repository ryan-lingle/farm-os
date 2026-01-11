import os
import requests
from datetime import datetime
from mcp.server.fastmcp import FastMCP

# API configuration
FARM_API_URL = os.getenv("FARM_API_URL", "http://localhost:3005/api/v1")

# Create an MCP server
mcp = FastMCP("farmAPI")


def _api_call(endpoint: str, method: str = "GET", params: dict = None, data: dict = None) -> dict:
    """Internal helper for API calls."""
    try:
        url = f"{FARM_API_URL.rstrip('/')}/{endpoint.lstrip('/')}"
        headers = {
            "Accept": "application/vnd.api+json",
            "Content-Type": "application/vnd.api+json",
        }

        resp = requests.request(
            method.upper(),
            url,
            params=params,
            json=data,
            headers=headers,
            timeout=15
        )

        try:
            response_data = resp.json()
        except Exception:
            response_data = resp.text

        if resp.ok:
            return {"success": True, "data": response_data, "status_code": resp.status_code}
        else:
            return {
                "success": False,
                "error": f"{resp.status_code} {resp.reason}",
                "status_code": resp.status_code,
                "response_data": response_data
            }
    except requests.exceptions.Timeout:
        return {"success": False, "error": "Request timed out"}
    except requests.exceptions.ConnectionError as e:
        return {"success": False, "error": f"Connection error: {str(e)}"}
    except Exception as e:
        return {"success": False, "error": f"Unexpected error: {str(e)}"}


# ============================================================================
# DISCOVERY TOOLS
# ============================================================================

@mcp.tool()
def get_api_info() -> dict:
    """
    Get information about the farmAPI including all available endpoints.
    Use this first to understand what resources and operations are available.
    """
    return _api_call("")


@mcp.tool()
def get_schema() -> dict:
    """
    Fetch the farmAPI schema showing available resource types and their structure.
    """
    return _api_call("schema")


# ============================================================================
# ASSET TOOLS
# ============================================================================

@mcp.tool()
def list_assets(
    asset_type: str,
    status: str = None,
    page: int = 1,
    per_page: int = 50
) -> dict:
    """
    List assets of a specific type.

    Args:
        asset_type: Type of assets - 'animal', 'plant', 'land', 'equipment', 'structure', 'material'
        status: Filter by status ('active', 'archived')
        page: Page number for pagination
        per_page: Items per page (default 50)
    """
    params = {"page": page, "per_page": per_page}
    if status:
        params["status"] = status
    return _api_call(f"assets/{asset_type}", params=params)


@mcp.tool()
def get_asset(asset_type: str, asset_id: int) -> dict:
    """
    Get a single asset by ID.

    Args:
        asset_type: Type of asset - 'animal', 'plant', 'land', 'equipment', 'structure', 'material'
        asset_id: The asset ID
    """
    return _api_call(f"assets/{asset_type}/{asset_id}")


@mcp.tool()
def create_asset(
    asset_type: str,
    name: str,
    status: str = "active",
    notes: str = None,
    quantity: int = None,
    current_location_id: int = None,
    parent_id: int = None,
    geometry: list = None
) -> dict:
    """
    Create a new asset.

    Args:
        asset_type: Type - 'animal', 'plant', 'land', 'equipment', 'structure', 'material'
        name: Name of the asset
        status: Status ('active' or 'archived')
        notes: Additional notes
        quantity: Quantity/count (for herds, flocks, etc.)
        current_location_id: ID of the location where asset is located
        parent_id: Parent asset ID (for hierarchies)
        geometry: GeoJSON geometry coordinates
    """
    attributes = {"name": name, "status": status, "asset_type": asset_type}

    if notes:
        attributes["notes"] = notes
    if quantity is not None:
        attributes["quantity"] = quantity
    if current_location_id is not None:
        attributes["current_location_id"] = current_location_id
    if parent_id is not None:
        attributes["parent_id"] = parent_id
    if geometry is not None:
        attributes["geometry"] = geometry

    data = {"data": {"type": "asset", "attributes": attributes}}
    return _api_call(f"assets/{asset_type}", method="POST", data=data)


@mcp.tool()
def update_asset(
    asset_type: str,
    asset_id: int,
    name: str = None,
    status: str = None,
    notes: str = None,
    quantity: int = None,
    current_location_id: int = None
) -> dict:
    """
    Update an existing asset.

    Args:
        asset_type: Type of asset
        asset_id: The asset ID to update
        name: New name (optional)
        status: New status (optional)
        notes: New notes (optional)
        quantity: New quantity (optional)
        current_location_id: New location ID (optional)
    """
    attributes = {}
    if name is not None:
        attributes["name"] = name
    if status is not None:
        attributes["status"] = status
    if notes is not None:
        attributes["notes"] = notes
    if quantity is not None:
        attributes["quantity"] = quantity
    if current_location_id is not None:
        attributes["current_location_id"] = current_location_id

    data = {"data": {"type": "asset", "id": str(asset_id), "attributes": attributes}}
    return _api_call(f"assets/{asset_type}/{asset_id}", method="PATCH", data=data)


@mcp.tool()
def delete_asset(asset_type: str, asset_id: int) -> dict:
    """
    Delete an asset.

    Args:
        asset_type: Type of asset
        asset_id: The asset ID to delete
    """
    return _api_call(f"assets/{asset_type}/{asset_id}", method="DELETE")


# ============================================================================
# LOG TOOLS
# ============================================================================

@mcp.tool()
def list_logs(
    log_type: str,
    status: str = None,
    page: int = 1,
    per_page: int = 50
) -> dict:
    """
    List logs of a specific type.

    Args:
        log_type: Type of logs - 'activity', 'harvest', 'observation', 'input', 'maintenance'
        status: Filter by status ('pending', 'done')
        page: Page number
        per_page: Items per page
    """
    params = {"page": page, "per_page": per_page}
    if status:
        params["status"] = status
    return _api_call(f"logs/{log_type}", params=params)


@mcp.tool()
def get_log(log_type: str, log_id: int) -> dict:
    """
    Get a single log by ID.

    Args:
        log_type: Type of log
        log_id: The log ID
    """
    return _api_call(f"logs/{log_type}/{log_id}")


@mcp.tool()
def create_log(
    log_type: str,
    name: str,
    status: str = "pending",
    notes: str = None,
    timestamp: str = None,
    asset_ids: list = None,
    from_location_id: int = None,
    to_location_id: int = None
) -> dict:
    """
    Create a new log entry.

    Args:
        log_type: Type - 'activity', 'harvest', 'observation', 'input', 'maintenance', 'movement'
        name: Name/description of the log
        status: Status ('pending' or 'done')
        notes: Additional notes
        timestamp: ISO format timestamp (defaults to now)
        asset_ids: List of related asset IDs
        from_location_id: Source location ID (for movement logs)
        to_location_id: Destination location ID (for movement logs)
    """
    attributes = {
        "name": name,
        "status": status,
        "log_type": log_type,
        "timestamp": timestamp or datetime.utcnow().isoformat()
    }

    if notes:
        attributes["notes"] = notes
    if from_location_id is not None:
        attributes["from_location_id"] = from_location_id
    if to_location_id is not None:
        attributes["to_location_id"] = to_location_id

    data = {"data": {"type": "log", "attributes": attributes}}

    # Handle asset associations separately if needed
    if asset_ids:
        data["data"]["relationships"] = {
            "assets": {"data": [{"type": "asset", "id": str(aid)} for aid in asset_ids]}
        }

    return _api_call(f"logs/{log_type}", method="POST", data=data)


@mcp.tool()
def create_harvest_log(
    name: str,
    quantity_value: float,
    quantity_unit: str,
    asset_ids: list = None,
    notes: str = None,
    timestamp: str = None
) -> dict:
    """
    Create a harvest log with quantity tracking. This triggers fact emission for yields.

    Args:
        name: Name of the harvest (e.g., 'Morning egg collection')
        quantity_value: Amount harvested
        quantity_unit: Unit of measurement (e.g., 'egg', 'kg', 'lbs', 'bushels')
        asset_ids: List of source asset IDs (e.g., flock ID)
        notes: Additional notes
        timestamp: ISO timestamp (defaults to now)
    """
    attributes = {
        "name": name,
        "status": "pending",
        "log_type": "harvest",
        "timestamp": timestamp or datetime.utcnow().isoformat()
    }

    if notes:
        attributes["notes"] = notes

    data = {"data": {"type": "log", "attributes": attributes}}

    if asset_ids:
        data["data"]["relationships"] = {
            "assets": {"data": [{"type": "asset", "id": str(aid)} for aid in asset_ids]}
        }

    # Create the log first
    result = _api_call("logs/harvest", method="POST", data=data)

    if result.get("success") and result.get("data", {}).get("data", {}).get("id"):
        log_id = result["data"]["data"]["id"]

        # Add quantity
        qty_data = {
            "data": {
                "type": "quantity",
                "attributes": {
                    "value": quantity_value,
                    "unit": quantity_unit,
                    "quantity_type": "harvest",
                    "log_id": int(log_id)
                }
            }
        }
        _api_call("quantities", method="POST", data=qty_data)

        # Complete the log to trigger fact emission
        complete_data = {
            "data": {
                "type": "log",
                "id": log_id,
                "attributes": {"status": "done"}
            }
        }
        return _api_call(f"logs/harvest/{log_id}", method="PATCH", data=complete_data)

    return result


@mcp.tool()
def update_log(
    log_type: str,
    log_id: int,
    name: str = None,
    status: str = None,
    notes: str = None
) -> dict:
    """
    Update an existing log.

    Args:
        log_type: Type of log
        log_id: The log ID to update
        name: New name (optional)
        status: New status - 'pending' or 'done' (optional)
        notes: New notes (optional)
    """
    attributes = {}
    if name is not None:
        attributes["name"] = name
    if status is not None:
        attributes["status"] = status
    if notes is not None:
        attributes["notes"] = notes

    data = {"data": {"type": "log", "id": str(log_id), "attributes": attributes}}
    return _api_call(f"logs/{log_type}/{log_id}", method="PATCH", data=data)


# ============================================================================
# LOCATION TOOLS
# ============================================================================

@mcp.tool()
def list_locations(page: int = 1, per_page: int = 50) -> dict:
    """
    List all farm locations with their geometry, asset counts, and hierarchy.

    Args:
        page: Page number
        per_page: Items per page
    """
    return _api_call("locations", params={"page": page, "per_page": per_page})


@mcp.tool()
def get_location(location_id: int) -> dict:
    """
    Get a single location by ID with full details including assets and movements.

    Args:
        location_id: The location ID
    """
    return _api_call(f"locations/{location_id}")


@mcp.tool()
def create_location(
    name: str,
    location_type: str = "polygon",
    geometry: list = None,
    notes: str = None,
    parent_id: int = None
) -> dict:
    """
    Create a new farm location.

    Args:
        name: Name of the location (e.g., 'North Pasture', 'Barn')
        location_type: Type - 'polygon', 'point', 'line'
        geometry: List of coordinate dicts with 'latitude' and 'longitude'
        notes: Additional notes
        parent_id: Parent location ID for hierarchy
    """
    attributes = {"name": name, "location_type": location_type}

    if geometry is not None:
        attributes["geometry"] = geometry
    if notes:
        attributes["notes"] = notes
    if parent_id is not None:
        attributes["parent_id"] = parent_id

    data = {"data": {"type": "location", "attributes": attributes}}
    return _api_call("locations", method="POST", data=data)


@mcp.tool()
def update_location(
    location_id: int,
    name: str = None,
    geometry: list = None,
    notes: str = None,
    parent_id: int = None
) -> dict:
    """
    Update an existing location.

    Args:
        location_id: The location ID to update
        name: New name (optional)
        geometry: New geometry coordinates (optional)
        notes: New notes (optional)
        parent_id: New parent location ID (optional)
    """
    attributes = {}
    if name is not None:
        attributes["name"] = name
    if geometry is not None:
        attributes["geometry"] = geometry
    if notes is not None:
        attributes["notes"] = notes
    if parent_id is not None:
        attributes["parent_id"] = parent_id

    data = {"data": {"type": "location", "id": str(location_id), "attributes": attributes}}
    return _api_call(f"locations/{location_id}", method="PATCH", data=data)


# ============================================================================
# PREDICATE TOOLS (Vocabulary/Schema)
# ============================================================================

@mcp.tool()
def list_predicates() -> dict:
    """
    List all predicates (vocabulary terms) that define the types of facts that can be recorded.
    Predicates include: yield, grazes, weight, milk_yield, health_status, body_condition_score, etc.
    """
    return _api_call("predicates")


@mcp.tool()
def get_predicate(predicate_id: str) -> dict:
    """
    Get details of a specific predicate.

    Args:
        predicate_id: The predicate UUID
    """
    return _api_call(f"predicates/{predicate_id}")


# ============================================================================
# FACT TOOLS (Knowledge Graph)
# ============================================================================

@mcp.tool()
def list_facts(
    subject_id: int = None,
    predicate_name: str = None,
    page: int = 1,
    per_page: int = 50
) -> dict:
    """
    List facts from the semantic knowledge graph.
    Facts record observations like 'Laying Hens yield 25 eggs'.

    Args:
        subject_id: Filter by subject asset ID
        predicate_name: Filter by predicate name (e.g., 'yield', 'grazes', 'weight')
        page: Page number
        per_page: Items per page
    """
    params = {"page": page, "per_page": per_page}
    if subject_id is not None:
        params["subject_id"] = subject_id
    if predicate_name:
        params["predicate"] = predicate_name
    return _api_call("facts", params=params)


@mcp.tool()
def get_fact(fact_id: str) -> dict:
    """
    Get a single fact by ID.

    Args:
        fact_id: The fact UUID
    """
    return _api_call(f"facts/{fact_id}")


@mcp.tool()
def create_fact(
    subject_id: int,
    predicate_name: str,
    value_numeric: float = None,
    unit: str = None,
    object_id: int = None,
    observed_at: str = None,
    log_id: int = None
) -> dict:
    """
    Create a new fact in the knowledge graph.

    Args:
        subject_id: The asset ID that is the subject of the fact
        predicate_name: Name of the predicate (e.g., 'yield', 'weight', 'health_status')
        value_numeric: Numeric value for measurements
        unit: Unit of measurement
        object_id: Object asset/location ID for relations
        observed_at: ISO timestamp when observed (defaults to now)
        log_id: Associated log ID
    """
    attributes = {
        "subject_id": subject_id,
        "predicate_name": predicate_name,
        "observed_at": observed_at or datetime.utcnow().isoformat()
    }

    if value_numeric is not None:
        attributes["value_numeric"] = value_numeric
    if unit:
        attributes["unit"] = unit
    if object_id is not None:
        attributes["object_id"] = object_id
    if log_id is not None:
        attributes["log_id"] = log_id

    data = {"data": {"type": "fact", "attributes": attributes}}
    return _api_call("facts", method="POST", data=data)


# ============================================================================
# QUANTITY TOOLS
# ============================================================================

@mcp.tool()
def list_quantities(log_id: int = None) -> dict:
    """
    List quantities, optionally filtered by log.

    Args:
        log_id: Filter by associated log ID
    """
    params = {}
    if log_id is not None:
        params["log_id"] = log_id
    return _api_call("quantities", params=params)


@mcp.tool()
def create_quantity(
    log_id: int,
    value: float,
    unit: str,
    quantity_type: str = "count",
    label: str = None,
    measure: str = None
) -> dict:
    """
    Create a quantity record associated with a log.

    Args:
        log_id: The log ID to associate with
        value: Numeric value
        unit: Unit of measurement
        quantity_type: Type - 'count', 'weight', 'volume', 'harvest'
        label: Optional label
        measure: Measurement type
    """
    attributes = {
        "log_id": log_id,
        "value": value,
        "unit": unit,
        "quantity_type": quantity_type
    }

    if label:
        attributes["label"] = label
    if measure:
        attributes["measure"] = measure

    data = {"data": {"type": "quantity", "attributes": attributes}}
    return _api_call("quantities", method="POST", data=data)


# ============================================================================
# CONVENIENCE TOOLS
# ============================================================================

@mcp.tool()
def move_asset(
    asset_id: int,
    to_location_id: int,
    asset_type: str = "animal",
    from_location_id: int = None,
    notes: str = None
) -> dict:
    """
    Move an asset to a new location by creating a movement log.

    Args:
        asset_id: The asset to move
        to_location_id: Destination location ID
        asset_type: Type of asset (animal, plant, equipment, etc.). Defaults to animal.
        from_location_id: Source location ID (optional, will be inferred from asset's current location)
        notes: Movement notes
    """
    # Validate that the destination location exists
    location_result = _api_call(f"locations/{to_location_id}")
    if not location_result.get("success"):
        return {
            "success": False,
            "error": f"Location {to_location_id} not found. Please use list_locations() to see available locations.",
            "error_code": "LOCATION_NOT_FOUND",
            "available_action": "Call list_locations() to get valid location IDs"
        }

    # Validate that the asset exists
    asset_result = _api_call(f"assets/{asset_type}/{asset_id}")
    if not asset_result.get("success"):
        return {
            "success": False,
            "error": f"Asset {asset_id} of type '{asset_type}' not found.",
            "error_code": "ASSET_NOT_FOUND",
            "available_action": f"Call list_assets(asset_type='{asset_type}') to get valid asset IDs"
        }

    # Get current location if not provided
    if from_location_id is None:
        from_location_id = asset_result.get("data", {}).get("data", {}).get("attributes", {}).get("current_location_id")

    # Create movement log
    log_result = create_log(
        log_type="movement",
        name=f"Move asset {asset_id}",
        status="done",
        notes=notes,
        asset_ids=[asset_id],
        from_location_id=from_location_id,
        to_location_id=to_location_id
    )

    if log_result.get("success"):
        # Update the asset's current location
        update_result = _api_call(
            f"assets/{asset_type}/{asset_id}",
            method="PATCH",
            data={
                "data": {
                    "type": "asset",
                    "id": str(asset_id),
                    "attributes": {"current_location_id": to_location_id}
                }
            }
        )
        return {"success": True, "log": log_result, "asset_update": update_result}

    return log_result


@mcp.tool()
def record_observation(
    asset_id: int,
    predicate_name: str,
    value: float,
    unit: str = None,
    notes: str = None
) -> dict:
    """
    Record an observation about an asset (creates both a log and a fact).

    Args:
        asset_id: The asset being observed
        predicate_name: What's being observed (e.g., 'weight', 'health_status', 'body_condition_score')
        value: The observed value
        unit: Unit of measurement
        notes: Observation notes
    """
    # Create observation log
    log_result = create_log(
        log_type="observation",
        name=f"Observation: {predicate_name}",
        status="done",
        notes=notes,
        asset_ids=[asset_id]
    )

    log_id = None
    if log_result.get("success"):
        log_id = log_result.get("data", {}).get("data", {}).get("id")

    # Create the fact
    fact_result = create_fact(
        subject_id=asset_id,
        predicate_name=predicate_name,
        value_numeric=value,
        unit=unit,
        log_id=int(log_id) if log_id else None
    )

    return {"success": True, "log": log_result, "fact": fact_result}


@mcp.tool()
def get_farm_summary() -> dict:
    """
    Get a summary of the farm including counts of assets, locations, and recent activity.
    """
    summary = {}

    # Get assets by type
    for asset_type in ["animal", "plant", "land", "equipment"]:
        result = _api_call(f"assets/{asset_type}")
        if result.get("success"):
            summary[f"{asset_type}_count"] = result.get("data", {}).get("meta", {}).get("total", 0)
            summary[f"{asset_type}s"] = [
                {"id": a["id"], "name": a["attributes"]["name"], "status": a["attributes"]["status"]}
                for a in result.get("data", {}).get("data", [])
            ]

    # Get locations
    locations_result = _api_call("locations")
    if locations_result.get("success"):
        summary["location_count"] = len(locations_result.get("data", {}).get("data", []))
        summary["locations"] = [
            {
                "id": l["id"],
                "name": l["attributes"]["name"],
                "area_acres": l["attributes"].get("area_in_acres"),
                "asset_count": l["attributes"].get("asset_count", 0)
            }
            for l in locations_result.get("data", {}).get("data", [])
        ]

    # Get predicates
    predicates_result = _api_call("predicates")
    if predicates_result.get("success"):
        summary["predicate_count"] = predicates_result.get("data", {}).get("meta", {}).get("total", 0)

    # Get facts
    facts_result = _api_call("facts")
    if facts_result.get("success"):
        summary["fact_count"] = facts_result.get("data", {}).get("meta", {}).get("total", 0)

    return {"success": True, "summary": summary}


# ============================================================================
# TASK TOOLS
# ============================================================================

@mcp.tool()
def list_tasks(
    state: str = None,
    plan_id: int = None,
    cycle_id: int = None,
    parent_id: int = None,
    unscheduled: bool = False,
    active: bool = False,
    completed: bool = False,
    blocked: bool = False,
    overdue: bool = False,
    page: int = 1,
    per_page: int = 50
) -> dict:
    """
    List tasks with various filters.

    Args:
        state: Filter by state - 'backlog', 'todo', 'in_progress', 'done', 'cancelled'
        plan_id: Filter by plan ID
        cycle_id: Filter by cycle ID
        parent_id: Filter by parent task ID (for subtasks)
        unscheduled: Show only tasks without a cycle
        active: Show only active tasks (todo or in_progress)
        completed: Show only completed tasks
        blocked: Show only blocked tasks
        overdue: Show only overdue tasks
        page: Page number
        per_page: Items per page
    """
    params = {"page": page, "per_page": per_page}
    if state:
        params["filter[state]"] = state
    if plan_id is not None:
        params["filter[plan_id]"] = plan_id
    if cycle_id is not None:
        params["filter[cycle_id]"] = cycle_id
    if parent_id is not None:
        params["filter[parent_id]"] = parent_id
    if unscheduled:
        params["filter[unscheduled]"] = "true"
    if active:
        params["filter[active]"] = "true"
    if completed:
        params["filter[completed]"] = "true"
    if blocked:
        params["filter[blocked]"] = "true"
    if overdue:
        params["filter[overdue]"] = "true"

    return _api_call("tasks", params=params)


@mcp.tool()
def get_task(task_id: int) -> dict:
    """
    Get a single task by ID with full details.

    Args:
        task_id: The task ID
    """
    return _api_call(f"tasks/{task_id}")


@mcp.tool()
def create_task(
    title: str,
    plan_id: int,
    description: str = None,
    state: str = "backlog",
    estimate: int = None,
    target_date: str = None,
    cycle_id: int = None,
    parent_id: int = None,
    asset_ids: list = None,
    location_ids: list = None
) -> dict:
    """
    Create a new task. Every task must belong to a plan.

    Args:
        title: Task title (required)
        plan_id: Plan ID to assign task to (required)
        description: Task description
        state: Initial state - 'backlog', 'todo', 'in_progress', 'done', 'cancelled' (default: backlog)
        estimate: Time estimate in minutes
        target_date: Target completion date (ISO format)
        cycle_id: Cycle to schedule task in
        parent_id: Parent task ID (for subtasks)
        asset_ids: List of related asset IDs
        location_ids: List of related location IDs
    """
    attributes = {"title": title, "state": state, "plan_id": plan_id}

    if description:
        attributes["description"] = description
    if estimate is not None:
        attributes["estimate"] = estimate
    if target_date:
        attributes["target_date"] = target_date
    if cycle_id is not None:
        attributes["cycle_id"] = cycle_id
    if parent_id is not None:
        attributes["parent_id"] = parent_id
    if asset_ids:
        attributes["asset_ids"] = asset_ids
    if location_ids:
        attributes["location_ids"] = location_ids

    data = {"data": {"type": "task", "attributes": attributes}}
    return _api_call("tasks", method="POST", data=data)


@mcp.tool()
def update_task(
    task_id: int,
    title: str = None,
    description: str = None,
    state: str = None,
    estimate: int = None,
    target_date: str = None,
    plan_id: int = None,
    cycle_id: int = None,
    parent_id: int = None
) -> dict:
    """
    Update an existing task.

    Args:
        task_id: The task ID to update
        title: New title
        description: New description
        state: New state - 'backlog', 'todo', 'in_progress', 'done', 'cancelled'
        estimate: New time estimate in minutes
        target_date: New target date (ISO format)
        plan_id: New plan ID (tasks must always belong to a plan)
        cycle_id: New cycle ID (use -1 to remove from cycle)
        parent_id: New parent task ID (use -1 to make root task)
    """
    attributes = {}
    if title is not None:
        attributes["title"] = title
    if description is not None:
        attributes["description"] = description
    if state is not None:
        attributes["state"] = state
    if estimate is not None:
        attributes["estimate"] = estimate
    if target_date is not None:
        attributes["target_date"] = target_date
    if plan_id is not None:
        attributes["plan_id"] = plan_id
    if cycle_id is not None:
        attributes["cycle_id"] = None if cycle_id == -1 else cycle_id
    if parent_id is not None:
        attributes["parent_id"] = None if parent_id == -1 else parent_id

    data = {"data": {"type": "task", "id": str(task_id), "attributes": attributes}}
    return _api_call(f"tasks/{task_id}", method="PATCH", data=data)


@mcp.tool()
def delete_task(task_id: int) -> dict:
    """
    Delete a task.

    Args:
        task_id: The task ID to delete
    """
    return _api_call(f"tasks/{task_id}", method="DELETE")


@mcp.tool()
def complete_task(task_id: int) -> dict:
    """
    Mark a task as completed (convenience method).

    Args:
        task_id: The task ID to complete
    """
    return update_task(task_id, state="done")


@mcp.tool()
def get_my_tasks(cycle_id: int = None) -> dict:
    """
    Get active tasks (todo or in_progress), optionally filtered by cycle.
    Use this to see what tasks need attention.

    Args:
        cycle_id: Optional cycle ID to filter by (defaults to all active tasks)
    """
    params = {"filter[active]": "true"}
    if cycle_id is not None:
        params["filter[cycle_id]"] = cycle_id
    return _api_call("tasks", params=params)


@mcp.tool()
def get_overdue_tasks() -> dict:
    """
    Get all tasks that are past their target date but not completed.
    """
    return _api_call("tasks", params={"filter[overdue]": "true"})


@mcp.tool()
def get_blocked_tasks() -> dict:
    """
    Get all tasks that are blocked by other incomplete tasks.
    """
    return _api_call("tasks", params={"filter[blocked]": "true"})


@mcp.tool()
def move_task_to_plan(task_id: int, plan_id: int) -> dict:
    """
    Move a task to a different plan.

    Args:
        task_id: The task ID
        plan_id: The plan ID to move to
    """
    return update_task(task_id, plan_id=plan_id)


@mcp.tool()
def schedule_task_to_cycle(task_id: int, cycle_id: int = None) -> dict:
    """
    Schedule a task to a cycle (or unschedule).

    Args:
        task_id: The task ID
        cycle_id: The cycle ID to schedule in (None to unschedule)
    """
    return update_task(task_id, cycle_id=-1 if cycle_id is None else cycle_id)


# ============================================================================
# PLAN TOOLS
# ============================================================================

@mcp.tool()
def list_plans(
    status: str = None,
    in_progress: bool = False,
    root_only: bool = False,
    parent_id: int = None,
    page: int = 1,
    per_page: int = 50
) -> dict:
    """
    List plans with optional filters. Plans are recursive - they can contain other plans.

    Args:
        status: Filter by status - 'planned', 'active', 'completed', 'cancelled'
        in_progress: Show only active plans
        root_only: Show only root-level plans (no parent)
        parent_id: Filter by parent plan ID (for child plans)
        page: Page number
        per_page: Items per page
    """
    params = {"page": page, "per_page": per_page}
    if status:
        params["filter[status]"] = status
    if in_progress:
        params["filter[in_progress]"] = "true"
    if root_only:
        params["filter[root_only]"] = "true"
    if parent_id is not None:
        params["filter[parent_id]"] = parent_id

    return _api_call("plans", params=params)


@mcp.tool()
def get_plan(plan_id: int) -> dict:
    """
    Get a single plan by ID with task counts and progress.

    Args:
        plan_id: The plan ID
    """
    return _api_call(f"plans/{plan_id}")


@mcp.tool()
def get_plan_children(plan_id: int) -> dict:
    """
    Get all child plans of a specific plan.

    Args:
        plan_id: The parent plan ID
    """
    return _api_call("plans", params={"filter[parent_id]": plan_id})


@mcp.tool()
def create_plan(
    name: str,
    description: str = None,
    status: str = "planned",
    start_date: str = None,
    target_date: str = None,
    parent_id: int = None
) -> dict:
    """
    Create a new plan. Plans can be nested within other plans.

    Args:
        name: Plan name (required)
        description: Plan description
        status: Initial status - 'planned', 'active', 'completed', 'cancelled' (default: planned)
        start_date: Plan start date (ISO format)
        target_date: Target completion date (ISO format)
        parent_id: Parent plan ID (for nested plans)
    """
    attributes = {"name": name, "status": status}

    if description:
        attributes["description"] = description
    if start_date:
        attributes["start_date"] = start_date
    if target_date:
        attributes["target_date"] = target_date
    if parent_id is not None:
        attributes["parent_id"] = parent_id

    data = {"data": {"type": "plan", "attributes": attributes}}
    return _api_call("plans", method="POST", data=data)


@mcp.tool()
def update_plan(
    plan_id: int,
    name: str = None,
    description: str = None,
    status: str = None,
    start_date: str = None,
    target_date: str = None,
    parent_id: int = None
) -> dict:
    """
    Update an existing plan.

    Args:
        plan_id: The plan ID to update
        name: New name
        description: New description
        status: New status - 'planned', 'active', 'completed', 'cancelled'
        start_date: New start date (ISO format)
        target_date: New target date (ISO format)
        parent_id: New parent plan ID (use -1 to make root plan)
    """
    attributes = {}
    if name is not None:
        attributes["name"] = name
    if description is not None:
        attributes["description"] = description
    if status is not None:
        attributes["status"] = status
    if start_date is not None:
        attributes["start_date"] = start_date
    if target_date is not None:
        attributes["target_date"] = target_date
    if parent_id is not None:
        attributes["parent_id"] = None if parent_id == -1 else parent_id

    data = {"data": {"type": "plan", "id": str(plan_id), "attributes": attributes}}
    return _api_call(f"plans/{plan_id}", method="PATCH", data=data)


@mcp.tool()
def delete_plan(plan_id: int) -> dict:
    """
    Delete a plan.

    Args:
        plan_id: The plan ID to delete
    """
    return _api_call(f"plans/{plan_id}", method="DELETE")


# ============================================================================
# CYCLE TOOLS
# ============================================================================

@mcp.tool()
def list_cycles(
    current: bool = False,
    past: bool = False,
    future: bool = False,
    page: int = 1,
    per_page: int = 50
) -> dict:
    """
    List cycles (time periods for task scheduling).

    Args:
        current: Show only the current cycle
        past: Show only past cycles
        future: Show only future cycles
        page: Page number
        per_page: Items per page
    """
    params = {"page": page, "per_page": per_page}
    if current:
        params["filter[current]"] = "true"
    if past:
        params["filter[past]"] = "true"
    if future:
        params["filter[future]"] = "true"

    return _api_call("cycles", params=params)


@mcp.tool()
def get_cycle(cycle_id: int) -> dict:
    """
    Get a single cycle by ID with task counts and progress.

    Args:
        cycle_id: The cycle ID
    """
    return _api_call(f"cycles/{cycle_id}")


@mcp.tool()
def get_current_cycle() -> dict:
    """
    Get the current active cycle based on today's date.
    Returns the cycle where today falls between start_date and end_date.
    """
    return _api_call("cycles/current")


@mcp.tool()
def create_cycle(
    name: str,
    start_date: str,
    end_date: str
) -> dict:
    """
    Create a new cycle.

    Args:
        name: Cycle name (e.g., 'Week 1', 'January Sprint')
        start_date: Cycle start date (ISO format, e.g., '2024-01-01')
        end_date: Cycle end date (ISO format, e.g., '2024-01-07')
    """
    attributes = {
        "name": name,
        "start_date": start_date,
        "end_date": end_date
    }

    data = {"data": {"type": "cycle", "attributes": attributes}}
    return _api_call("cycles", method="POST", data=data)


@mcp.tool()
def generate_cycles(
    start_date: str,
    count: int,
    duration_days: int = 7
) -> dict:
    """
    Generate multiple consecutive cycles (e.g., for sprint planning).

    Args:
        start_date: Start date for first cycle (ISO format)
        count: Number of cycles to generate
        duration_days: Duration of each cycle in days (default: 7 for weekly)
    """
    data = {
        "start_date": start_date,
        "count": count,
        "duration_days": duration_days
    }
    return _api_call("cycles/generate", method="POST", data=data)


@mcp.tool()
def update_cycle(
    cycle_id: int,
    name: str = None,
    start_date: str = None,
    end_date: str = None
) -> dict:
    """
    Update an existing cycle.

    Args:
        cycle_id: The cycle ID to update
        name: New name
        start_date: New start date (ISO format)
        end_date: New end date (ISO format)
    """
    attributes = {}
    if name is not None:
        attributes["name"] = name
    if start_date is not None:
        attributes["start_date"] = start_date
    if end_date is not None:
        attributes["end_date"] = end_date

    data = {"data": {"type": "cycle", "id": str(cycle_id), "attributes": attributes}}
    return _api_call(f"cycles/{cycle_id}", method="PATCH", data=data)


@mcp.tool()
def delete_cycle(cycle_id: int) -> dict:
    """
    Delete a cycle.

    Args:
        cycle_id: The cycle ID to delete
    """
    return _api_call(f"cycles/{cycle_id}", method="DELETE")


# ============================================================================
# TASK RELATION TOOLS
# ============================================================================

@mcp.tool()
def add_task_blocker(task_id: int, blocked_by_task_id: int) -> dict:
    """
    Add a blocking relationship between tasks.
    The blocked_by_task_id task will block task_id from being completed.

    Args:
        task_id: The task that will be blocked
        blocked_by_task_id: The task that blocks completion
    """
    attributes = {
        "source_task_id": blocked_by_task_id,
        "target_task_id": task_id,
        "relation_type": "blocks"
    }
    data = {"data": {"type": "task_relation", "attributes": attributes}}
    return _api_call("task_relations", method="POST", data=data)


@mcp.tool()
def remove_task_blocker(task_id: int, blocked_by_task_id: int) -> dict:
    """
    Remove a blocking relationship between tasks.

    Args:
        task_id: The task that was blocked
        blocked_by_task_id: The task that was blocking
    """
    # First find the relation
    params = {
        "filter[source_task_id]": blocked_by_task_id,
        "filter[target_task_id]": task_id,
        "filter[relation_type]": "blocks"
    }
    result = _api_call("task_relations", params=params)

    if result.get("success") and result.get("data", {}).get("data"):
        relations = result["data"]["data"]
        if relations:
            relation_id = relations[0]["id"]
            return _api_call(f"task_relations/{relation_id}", method="DELETE")

    return {"success": False, "error": "Blocking relationship not found"}


@mcp.tool()
def get_task_blockers(task_id: int) -> dict:
    """
    Get all tasks that block a specific task.

    Args:
        task_id: The task to check blockers for
    """
    params = {
        "filter[target_task_id]": task_id,
        "filter[relation_type]": "blocks"
    }
    return _api_call("task_relations", params=params)


@mcp.tool()
def get_tasks_blocked_by(task_id: int) -> dict:
    """
    Get all tasks that are blocked by a specific task.

    Args:
        task_id: The blocking task
    """
    params = {
        "filter[source_task_id]": task_id,
        "filter[relation_type]": "blocks"
    }
    return _api_call("task_relations", params=params)


@mcp.tool()
def add_related_task(task_id: int, related_task_id: int) -> dict:
    """
    Add a 'related' relationship between two tasks.

    Args:
        task_id: First task
        related_task_id: Related task
    """
    attributes = {
        "source_task_id": task_id,
        "target_task_id": related_task_id,
        "relation_type": "related"
    }
    data = {"data": {"type": "task_relation", "attributes": attributes}}
    return _api_call("task_relations", method="POST", data=data)


@mcp.tool()
def mark_task_duplicate(task_id: int, duplicate_of_task_id: int) -> dict:
    """
    Mark a task as a duplicate of another task.

    Args:
        task_id: The duplicate task
        duplicate_of_task_id: The original task
    """
    attributes = {
        "source_task_id": task_id,
        "target_task_id": duplicate_of_task_id,
        "relation_type": "duplicate"
    }
    data = {"data": {"type": "task_relation", "attributes": attributes}}
    return _api_call("task_relations", method="POST", data=data)


if __name__ == "__main__":
    mcp.run()
