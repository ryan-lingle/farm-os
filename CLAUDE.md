# CLAUDE.md

This file provides guidance to Claude Code when working with the farmOS monorepo.

## Project Overview

farmOS is a farm management system consisting of three integrated components:

```
farmOS/
├── api/           # Rails API backend (port 3005)
├── client/        # React/Vite frontend (port 8080)
└── mcp-server/    # Python MCP server for AI integrations
```

## Quick Start

### Starting All Services
```bash
docker compose up -d
```

### Stopping All Services
```bash
docker compose down
```

### Viewing Logs
```bash
docker compose logs -f          # All services
docker compose logs -f api      # API only
docker compose logs -f client   # Client only
```

## Port Assignments (No Conflicts with OpenDate)

| Service     | Port  | Description                |
|-------------|-------|----------------------------|
| PostgreSQL  | 5433  | Database (OpenDate uses 5432) |
| API         | 3005  | Rails API (OpenDate uses 3000) |
| Client      | 8080  | Vite dev server            |

## API Component (`/api`)

Rails 8 API backend using JSON:API format.

### Key Resources
- **Assets**: `/api/v1/assets/{type}` - Animal, plant, land, equipment, structure, material
- **Logs**: `/api/v1/logs/{type}` - Activity, harvest, observation, input, maintenance
- **Locations**: `/api/v1/locations` - Farm locations with geometry
- **Predicates**: `/api/v1/predicates` - Semantic vocabulary (yield, weight, etc.)
- **Facts**: `/api/v1/facts` - Knowledge graph for observations

### Running Tests
```bash
docker compose exec api rails test
docker compose exec api rails test test/models/asset_test.rb
```

### Rails Console
```bash
docker compose exec api rails console
```

## Client Component (`/client`)

React + Vite + TypeScript frontend with Mapbox GL integration.

### Stack
- React 18 with TypeScript
- Vite for build/dev
- Tailwind CSS + shadcn/ui
- Mapbox GL for maps
- TanStack Query for data fetching

### Key Files
- `src/lib/api.ts` - API client
- `src/components/MapInterface.tsx` - Main map view
- `src/hooks/useAssets.ts`, `useLocations.ts`, `useLogs.ts` - Data hooks

### Environment Variable
The client reads `VITE_API_BASE_URL` for the API endpoint (defaults to `http://localhost:3005`).

## MCP Server Component (`/mcp-server`)

Python-based Model Context Protocol server for AI assistant integrations.

### Available Tools
- `get_api_info()`, `get_schema()` - Discovery
- `list_assets()`, `get_asset()`, `create_asset()`, `update_asset()`, `delete_asset()` - Asset management
- `list_logs()`, `get_log()`, `create_log()`, `create_harvest_log()` - Log management
- `list_locations()`, `get_location()`, `create_location()`, `update_location()` - Location management
- `list_predicates()`, `list_facts()`, `create_fact()` - Semantic knowledge graph
- `move_asset()`, `record_observation()`, `get_farm_summary()` - Convenience tools

### Running Locally (for Claude integration)
```bash
cd mcp-server
source .venv/bin/activate
python main.py
```

### MCP Configuration
The `.mcp.json` file configures the MCP server for Claude Code integration:
```json
{
  "mcpServers": {
    "farmos": {
      "type": "stdio",
      "command": "/Users/ryanlingle/code/farmOS/mcp-server/.venv/bin/python",
      "args": ["/Users/ryanlingle/code/farmOS/mcp-server/main.py"],
      "env": {
        "FARM_API_URL": "http://localhost:3005/api/v1"
      }
    }
  }
}
```

## Development Workflow

### Adding a New API Endpoint
1. Create/modify controller in `api/app/controllers/api/v1/`
2. Update routes in `api/config/routes.rb`
3. Add tests in `api/test/`
4. Update MCP server tools in `mcp-server/main.py` if needed

### Adding a New Client Feature
1. Add API types to `client/src/lib/api.ts`
2. Create/modify hooks in `client/src/hooks/`
3. Build UI components in `client/src/components/`
4. Add pages in `client/src/pages/`

### Database Migrations
```bash
docker compose exec api rails db:migrate
docker compose exec api rails db:rollback
```

## Architecture Notes

### Data Model
- **Assets** represent physical things on the farm (animals, plants, land, equipment)
- **Logs** record activities and events (harvests, observations, movements)
- **Locations** are geographic areas with geometry (polygons/points)
- **Facts** form a semantic knowledge graph linking assets to observations via predicates

### Hierarchy Support
Both Assets and Locations support parent-child hierarchies via `parent_id` field.

### JSON:API Format
The API follows JSON:API spec. Request/response format:
```json
{
  "data": {
    "type": "asset",
    "id": "1",
    "attributes": { "name": "Laying Hens", "status": "active" }
  }
}
```
