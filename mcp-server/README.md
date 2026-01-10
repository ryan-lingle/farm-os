# farmAPI MCP Server

A Model Context Protocol (MCP) server for interacting with the farmAPI.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure the API URL (optional):
```bash
export FARM_API_URL=http://localhost:3005/api/v1
```

By default, the server connects to `http://localhost:3005/api/v1`.

## Running the Server

### Direct execution:
```bash
python main.py
```

### Using the shell script:
```bash
./run_farmos.sh
```

## Available Tools

The MCP server provides the following tools:

### 1. `inspect_schema`
Fetches and returns the farmAPI schema, showing available endpoints, resource types, and required fields.

### 2. `dynamic_api_call`
Makes any API call to the farmAPI. Parameters:
- `endpoint`: API endpoint (e.g., '/assets/animal')
- `method`: HTTP method (GET, POST, PATCH, DELETE)
- `params`: Query parameters (optional)
- `data`: Request body (optional)
- `headers`: Additional headers (optional)

### 3. `create_animal_asset`
Creates a new animal asset. Parameters:
- `name`: Name of the animal (required)
- `animal_type`: Type of animal (e.g., 'cattle', 'chicken', 'pig')
- `breed`: Breed of the animal
- `sex`: Sex of the animal ('male', 'female', 'unknown')
- `notes`: Additional notes
- `status`: Status of the asset (default: 'active')

### 4. `list_assets`
Lists assets of a specific type. Parameters:
- `asset_type`: Type of assets to list ('animal', 'plant', 'land') (required)
- `status`: Filter by status
- `archived`: Filter by archived status
- `page`: Page number for pagination
- `per_page`: Number of items per page

### 5. `create_harvest_log`
Creates a harvest log entry. Parameters:
- `name`: Name of the harvest log (required)
- `quantity_value`: Harvest quantity value (required)
- `quantity_unit`: Unit of measurement (required)
- `crop_type`: Type of crop harvested
- `notes`: Additional notes
- `timestamp`: ISO format timestamp
- `asset_ids`: List of related asset IDs

## Usage with Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "farmAPI": {
      "command": "/Users/ryanlingle/code/farmos_mcp/run_farmos.sh",
      "env": {
        "FARM_API_URL": "http://localhost:3005/api/v1"
      }
    }
  }
}
``` 