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


if __name__ == "__main__":
    mcp.run()
