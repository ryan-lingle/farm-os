/**
 * useChat hook for farmOS AI assistant.
 * Manages chat state, message history, and API communication.
 * Supports persistent storage via conversation API.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { sendChatMessage, ChatContext } from '@/lib/chat-api';
import { conversationsApi } from '@/lib/api';
import { ChatBridge } from '@/lib/chat-bridge';
import type { ChatMessage, ChatImage, ToolCall } from '@/types/chat';

interface UseChatOptions {
  conversationId?: string;
  onMessagesChange?: (messages: ChatMessage[]) => void;
  maxHistoryMessages?: number; // Limit history sent to API to avoid context overflow
  context?: ChatContext; // Optional resource context for "Chat About" feature
}

// Default max history to prevent context length exceeded errors
const DEFAULT_MAX_HISTORY = 20;

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  sendMessage: (message: string, images?: ChatImage[], overrideContext?: ChatContext) => Promise<void>;
  loadMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
  clearError: () => void;
  setConversationId: (id: string) => void;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { conversationId, onMessagesChange, maxHistoryMessages = DEFAULT_MAX_HISTORY, context } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use a ref to track the latest conversationId for use in callbacks
  const conversationIdRef = useRef<string | undefined>(conversationId);
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  // Save messages to backend (debounced)
  const saveMessages = useCallback(async (msgs: ChatMessage[]) => {
    const currentConvId = conversationIdRef.current;
    if (!currentConvId) return;

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await conversationsApi.update(currentConvId, { messages: msgs });
        // Invalidate conversation query to keep cache in sync
        queryClient.invalidateQueries({ queryKey: ['conversation', currentConvId] });
      } catch (err) {
        console.error('Failed to save messages:', err);
      } finally {
        setIsSaving(false);
      }
    }, 500);
  }, [queryClient]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const sendMessage = useCallback(async (message: string, images?: ChatImage[], overrideContext?: ChatContext) => {
    // Use override context if provided, otherwise use context from options
    const effectiveContext = overrideContext ?? context;

    if (!message.trim() && (!images || images.length === 0)) return;

    // Add user message to chat
    const userMessage: ChatMessage = { role: 'user', content: message, images };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);
    setError(null);

    try {
      // Build history for API (exclude the message we just added)
      // Limit to last N messages to avoid context length exceeded errors
      const recentMessages = messages.slice(-maxHistoryMessages);
      const history = recentMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await sendChatMessage(message, history, effectiveContext);

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
        // Handle client-side commands like draw_on_map
        handleClientSideCommands(response.tool_calls);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      // Remove the user message if the request failed
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  }, [messages, queryClient, saveMessages, onMessagesChange, context, maxHistoryMessages]);

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

  // Allow external code to update the conversation ID (useful for race conditions)
  const setConversationId = useCallback((id: string) => {
    conversationIdRef.current = id;
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
    setConversationId,
  };
}

/**
 * Handle client-side commands from tool calls.
 * These are tools that don't execute on the server but trigger UI actions.
 *
 * DISABLED: AI drawing tools were a failed experiment - keeping code for future reference.
 */
function handleClientSideCommands(_toolCalls: ToolCall[]) {
  // DISABLED: AI drawing commands
  // The AI drawing feature didn't work well - LLMs are not good at:
  // - Mathematical calculations (grid indices → lat/lng conversion)
  // - Spatial reasoning (interpreting contour patterns)
  // - Generating precise coordinate arrays
  //
  // Future approach: Have client-side do spatial analysis and present
  // candidates to AI for selection, rather than having AI do the math.

  /*
  for (const toolCall of toolCalls) {
    const args = toolCall.arguments as Record<string, unknown>;

    switch (toolCall.name) {
      case 'start_drawing': {
        const startArgs = args as { mode?: string };
        if (startArgs.mode) {
          ChatBridge.executeCommand({
            type: 'start-drawing',
            mode: startArgs.mode as 'polygon' | 'linestring' | 'point' | 'circle' | 'select' | 'static',
          });
        }
        break;
      }

      case 'add_feature': {
        const addArgs = args as { feature?: unknown; auto_select?: boolean };
        if (addArgs.feature) {
          ChatBridge.executeCommand({
            type: 'add-feature',
            feature: addArgs.feature as any,
            autoSelect: addArgs.auto_select ?? true,
          });
        }
        break;
      }

      case 'select_feature': {
        const selectArgs = args as { feature_id?: string };
        if (selectArgs.feature_id) {
          ChatBridge.executeCommand({
            type: 'select-feature',
            featureId: selectArgs.feature_id,
          });
        }
        break;
      }

      case 'update_feature': {
        const updateArgs = args as { feature_id?: string; properties?: Record<string, any>; geometry?: any };
        if (updateArgs.feature_id) {
          ChatBridge.executeCommand({
            type: 'update-feature',
            featureId: updateArgs.feature_id,
            properties: updateArgs.properties,
            geometry: updateArgs.geometry,
          });
        }
        break;
      }

      case 'delete_feature': {
        const deleteArgs = args as { feature_id?: string };
        if (deleteArgs.feature_id) {
          ChatBridge.executeCommand({
            type: 'delete-feature',
            featureId: deleteArgs.feature_id,
          });
        }
        break;
      }

      case 'clear_features': {
        ChatBridge.executeCommand({
          type: 'clear-features',
        });
        break;
      }

      case 'get_features': {
        ChatBridge.executeCommand({
          type: 'get-features',
          callback: (features) => {
            console.log('[useChat] Received features:', features.length);
          },
        });
        break;
      }
    }
  }
  */
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
