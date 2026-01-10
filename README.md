# FarmOS

A comprehensive farm management system consisting of three integrated components:

## Project Structure

```
farmOS/
├── api/           # Rails API backend
├── client/        # React/Vite frontend
└── mcp-server/    # Python MCP server for AI integrations
```

## Components

### API (`/api`)
Rails API backend for farm data management. Handles assets, locations, logs, and facts.

**Stack:** Ruby on Rails, PostgreSQL

```bash
cd api
bundle install
rails db:setup
rails server
```

### Client (`/client`)
React frontend with Mapbox integration for farm visualization and management.

**Stack:** React, Vite, TypeScript, Tailwind CSS, Mapbox GL

```bash
cd client
npm install
npm run dev
```

### MCP Server (`/mcp-server`)
Python-based Model Context Protocol server for AI assistant integrations.

**Stack:** Python, MCP SDK

```bash
cd mcp-server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

## Development

Each component can be developed independently. See the README in each subdirectory for specific setup instructions.

## License

MIT
