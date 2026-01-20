/**
 * Hooks for interacting with the ChatBridge.
 *
 * These hooks provide convenient ways for components to:
 * - Inject context data for the chat
 * - Handle commands from the chat
 */

import { useEffect, useCallback } from 'react';
import { useChatBridgeContext } from '@/contexts/ChatBridgeContext';
import type { ClientContext, ChatCommand, TopographyContext } from '@/lib/chat-bridge';

/**
 * Hook for components that want to inject context into the chat.
 * Automatically cleans up context when component unmounts.
 *
 * @example
 * ```tsx
 * const { injectContext } = useInjectContext();
 *
 * useEffect(() => {
 *   injectContext('topography', topographyData);
 * }, [topographyData, injectContext]);
 * ```
 */
export function useInjectContext() {
  const { injectContext, removeContext } = useChatBridgeContext();
  return { injectContext, removeContext };
}

/**
 * Hook for components that handle commands from the chat.
 * Automatically subscribes/unsubscribes on mount/unmount.
 *
 * @example
 * ```tsx
 * useChatCommands((command) => {
 *   if (command.type === 'draw') {
 *     // Draw features on map
 *   }
 * });
 * ```
 */
export function useChatCommands(handler: (command: ChatCommand) => void) {
  const { subscribeToCommands } = useChatBridgeContext();

  useEffect(() => {
    const unsubscribe = subscribeToCommands(handler);
    return unsubscribe;
  }, [subscribeToCommands, handler]);
}

/**
 * Hook to get the current client context.
 * Re-renders when context changes.
 */
export function useClientContext(): ClientContext {
  const { clientContext } = useChatBridgeContext();
  return clientContext;
}

/**
 * Hook to get topography context specifically.
 */
export function useTopographyContextData(): TopographyContext | undefined {
  const { clientContext } = useChatBridgeContext();
  return clientContext.topography;
}

/**
 * Hook for the chat to execute commands.
 * Returns a function to send commands to page components.
 */
export function useExecuteCommand() {
  const { executeCommand } = useChatBridgeContext();
  return executeCommand;
}

/**
 * Hook that combines context injection with automatic cleanup.
 * Pass the key and data, and it will inject on mount/update
 * and remove on unmount.
 *
 * @example
 * ```tsx
 * useAutoInjectContext('topography', topographyData);
 * ```
 */
export function useAutoInjectContext<K extends keyof ClientContext>(
  key: K,
  data: ClientContext[K] | null | undefined
) {
  const { injectContext, removeContext } = useChatBridgeContext();

  useEffect(() => {
    if (data) {
      injectContext(key, data);
    } else {
      removeContext(key);
    }

    // Cleanup on unmount
    return () => {
      removeContext(key);
    };
  }, [key, data, injectContext, removeContext]);
}

// Re-export types for convenience
export type { ClientContext, ChatCommand, TopographyContext } from '@/lib/chat-bridge';
