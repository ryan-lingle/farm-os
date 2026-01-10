# Dockerfile for farmOS MCP Server
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# The MCP server runs via stdio for Claude integration
# This container is primarily for building and testing
CMD ["python", "main.py"]
