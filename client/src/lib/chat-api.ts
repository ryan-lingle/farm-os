/**
 * Chat API client for farmOS AI assistant.
 */

import type { ChatMessage, ChatResponse } from '@/types/chat';

const CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL || 'http://localhost:8000';

export interface ChatContext {
  type: 'task' | 'plan' | 'asset' | 'location' | 'log';
  id: number;
  data: string; // Markdown-formatted context about the resource
}

export async function sendChatMessage(
  message: string,
  history: ChatMessage[] = [],
  context?: ChatContext
): Promise<ChatResponse> {
  console.log('[chat-api] Sending message:', message);
  console.log('[chat-api] History length:', history.length);
  console.log('[chat-api] Context:', context ? context.type : 'none');

  const response = await fetch(`${CHAT_API_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, history, context }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Chat request failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('[chat-api] Response received');
  console.log('[chat-api] Message:', data.message?.substring(0, 100) + '...');
  console.log('[chat-api] Tool calls count:', data.tool_calls?.length || 0);
  if (data.tool_calls?.length > 0) {
    console.log('[chat-api] Tool calls:', JSON.stringify(data.tool_calls, null, 2));
  }
  return data;
}

export async function checkChatHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${CHAT_API_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
