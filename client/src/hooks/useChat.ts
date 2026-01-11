/**
 * useChat hook for farmOS AI assistant.
 * Manages chat state, message history, and API communication.
 * Supports persistent storage via conversation API.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { sendChatMessage } from '@/lib/chat-api';
import { conversationsApi } from '@/lib/api';
import type { ChatMessage, ChatImage, ToolCall } from '@/types/chat';

interface UseChatOptions {
  conversationId?: string;
  onMessagesChange?: (messages: ChatMessage[]) => void;
}

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  sendMessage: (message: string, images?: ChatImage[]) => Promise<void>;
  loadMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
  clearError: () => void;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { conversationId, onMessagesChange } = options;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Save messages to backend (debounced)
  const saveMessages = useCallback(async (msgs: ChatMessage[]) => {
    if (!conversationId) return;

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await conversationsApi.update(conversationId, { messages: msgs });
        // Invalidate conversation query to keep cache in sync
        queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      } catch (err) {
        console.error('Failed to save messages:', err);
      } finally {
        setIsSaving(false);
      }
    }, 500);
  }, [conversationId, queryClient]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const sendMessage = useCallback(async (message: string, images?: ChatImage[]) => {
    if (!message.trim() && (!images || images.length === 0)) return;

    // Add user message to chat
    const userMessage: ChatMessage = { role: 'user', content: message, images };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);
    setError(null);

    try {
      // Build history for API (exclude the message we just added)
      const history = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await sendChatMessage(message, history);

      // Add assistant response with any tool calls (for error display)
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.message,
        toolCalls: response.tool_calls,
      };
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      // Save messages to backend
      saveMessages(finalMessages);

      // Notify parent of changes
      onMessagesChange?.(finalMessages);

      // If there were tool calls, invalidate relevant queries to refresh data
      if (response.tool_calls && response.tool_calls.length > 0) {
        invalidateQueriesForToolCalls(response.tool_calls, queryClient);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      // Remove the user message if the request failed
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  }, [messages, queryClient, saveMessages, onMessagesChange]);

  const loadMessages = useCallback((msgs: ChatMessage[]) => {
    setMessages(msgs);
    setError(null);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    isSaving,
    error,
    sendMessage,
    loadMessages,
    clearMessages,
    clearError,
  };
}

/**
 * Invalidate queries based on what tools were called.
 * This ensures the UI reflects any changes made via chat.
 */
function invalidateQueriesForToolCalls(
  toolCalls: ToolCall[],
  queryClient: ReturnType<typeof useQueryClient>
) {
  const toolsToQueryKeys: Record<string, string[][]> = {
    // Asset tools
    create_asset: [['assets']],
    update_asset: [['assets']],
    delete_asset: [['assets']],
    list_assets: [],
    get_asset: [],

    // Location tools
    create_location: [['locations']],
    update_location: [['locations']],
    list_locations: [],
    get_location: [],

    // Log tools
    create_log: [['logs']],
    update_log: [['logs']],
    create_harvest_log: [['logs'], ['assets']],
    list_logs: [],
    get_log: [],

    // Movement and observation tools
    move_asset: [['assets'], ['locations'], ['logs']],
    record_observation: [['assets'], ['logs'], ['facts']],

    // Fact tools
    create_fact: [['facts']],
    list_facts: [],
    get_fact: [],

    // Summary tools
    get_farm_summary: [],
  };

  const keysToInvalidate = new Set<string>();

  for (const toolCall of toolCalls) {
    const queryKeys = toolsToQueryKeys[toolCall.name];
    if (queryKeys) {
      for (const key of queryKeys) {
        keysToInvalidate.add(JSON.stringify(key));
      }
    }
  }

  // Invalidate all affected query keys
  for (const keyStr of keysToInvalidate) {
    const key = JSON.parse(keyStr);
    queryClient.invalidateQueries({ queryKey: key });
  }
}
