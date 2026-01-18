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

  return response.json();
}

export async function checkChatHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${CHAT_API_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
