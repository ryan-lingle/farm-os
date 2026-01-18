"""FastAPI HTTP server for farmOS chat endpoint."""

import os
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from chat import chat as chat_function

# Create FastAPI app
app = FastAPI(
    title="farmOS Chat API",
    description="Chat endpoint for natural language interaction with farmOS",
    version="1.0.0"
)

# Configure CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatContext(BaseModel):
    """Context about a resource being discussed."""
    type: str  # 'task', 'plan', 'asset', 'location', 'log'
    id: int
    data: str  # Markdown-formatted context about the resource


class ChatRequest(BaseModel):
    """Request model for chat endpoint."""
    message: str
    history: Optional[list[dict]] = None
    context: Optional[ChatContext] = None


class ToolCall(BaseModel):
    """Model for a tool call."""
    name: str
    arguments: dict
    result: Optional[dict] = None
    error: Optional[str] = None


class ChatResponse(BaseModel):
    """Response model for chat endpoint."""
    message: str
    tool_calls: list[ToolCall] = []


class HealthResponse(BaseModel):
    """Response model for health check."""
    status: str


class ErrorResponse(BaseModel):
    """Response model for errors."""
    error: str


# Alias for the chat function (allows patching in tests)
chat = chat_function


@app.post("/chat", response_model=ChatResponse, responses={500: {"model": ErrorResponse}})
async def chat_endpoint(request: ChatRequest) -> ChatResponse:
    """Process a chat message and return AI response.

    The endpoint accepts a message and optional conversation history,
    processes it through OpenAI with tool calling capabilities,
    and returns the AI's response along with any tool calls made.
    """
    try:
        # Convert context to dict if provided
        context_dict = None
        if request.context:
            context_dict = {
                "type": request.context.type,
                "id": request.context.id,
                "data": request.context.data
            }

        result = await chat(request.message, history=request.history, context=context_dict)
        return ChatResponse(
            message=result["message"],
            tool_calls=result.get("tool_calls", [])
        )
    except Exception as e:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(status="healthy")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
