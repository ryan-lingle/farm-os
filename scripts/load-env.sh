#!/bin/bash
# Load environment variables from shared location for git worktree support
# This allows the same .env to work across all worktrees

SHARED_ENV_DIR="${HOME}/.config/farmOS"
SHARED_ENV_FILE="${SHARED_ENV_DIR}/.env"

# Create config directory if it doesn't exist
mkdir -p "${SHARED_ENV_DIR}"

# If shared .env exists, export its variables
if [ -f "${SHARED_ENV_FILE}" ]; then
    set -a
    source "${SHARED_ENV_FILE}"
    set +a
    echo "Loaded environment from ${SHARED_ENV_FILE}"
# Fall back to local .env if it exists (for backwards compatibility)
elif [ -f ".env" ]; then
    set -a
    source ".env"
    set +a
    echo "Loaded environment from local .env"
else
    echo "Warning: No .env file found."
    echo "Create ${SHARED_ENV_FILE} with your secrets (works across all worktrees)"
    echo "Or create a local .env file in this directory"
    echo ""
    echo "Required variables:"
    echo "  VITE_MAPBOX_TOKEN=your_mapbox_token"
    echo "  OPENAI_API_KEY=your_openai_key (optional)"
fi
