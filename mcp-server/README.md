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

## Task Creation Guidelines

When importing task lists from documents (markdown checklists, project plans, etc.):

### Task Granularity
- **Tasks should represent ~1 day of work** (or a logical work session)
- Individual checklist items (bullet points) should become **checklist items in the task description**, not separate tasks
- Group related small items into a single task with a descriptive title

### Example Transformation
**DON'T** create separate tasks for:
```
- Lock apple tree count (20)
- Confirm rootstock preference
- Confirm nursery
```

**DO** create one task:
```
Title: "Finalize apple tree order decisions"
Description:
- [ ] Lock apple tree count (20)
- [ ] Confirm rootstock preference (M-111 or B-118)
- [ ] Confirm nursery: Morse Nursery
```

### Guidelines
1. Each Saturday/Sunday of physical work = 1 task
2. Research/planning that happens over a week = 1 task
3. Purchasing trips = 1 task per trip
4. Use task descriptions for the detailed checklist items
5. Target 10-20 tasks per multi-month project, not 50+

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