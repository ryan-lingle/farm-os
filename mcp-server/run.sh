#!/bin/bash
# Run the farmOS MCP server
# This script handles venv setup and environment configuration

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Create venv if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..." >&2
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -q -r requirements.txt
else
    source .venv/bin/activate
fi

# Default API URL - works with Docker setup on port 3005
# Can be overridden by setting FARM_API_URL environment variable
export FARM_API_URL="${FARM_API_URL:-http://localhost:3005/api/v1}"

exec python main.py
