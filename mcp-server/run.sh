#!/bin/bash
# Run the farmOS MCP server
cd "$(dirname "$0")"
source .venv/bin/activate
exec python main.py
