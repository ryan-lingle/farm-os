/**
 * React context provider for ChatBridge.
 * Provides reactive state updates when context changes.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  ChatBridge,
  type ClientContext,
  type ChatCommand,
  type ChatBridgeEvent,
} from '@/lib/chat-bridge';

interface ChatBridgeContextValue {
  // Current client context (reactive)
  clientContext: ClientContext;

  // Inject context data
  injectContext: (key: keyof ClientContext, data: any) => void;

  // Remove context data
  removeContext: (key: keyof ClientContext) => void;

  // Execute a command (from chat to components)
  executeCommand: (command: ChatCommand) => void;

  // Subscribe to commands (for components that handle commands)
  subscribeToCommands: (callback: (command: ChatCommand) => void) => () => void;

  // Clear all context
  clearContext: () => void;
}

const ChatBridgeContext = createContext<ChatBridgeContextValue | null>(null);

interface ChatBridgeProviderProps {
  children: ReactNode;
}

export function ChatBridgeProvider({ children }: ChatBridgeProviderProps) {
  const [clientContext, setClientContext] = useState<ClientContext>(() => ChatBridge.getContext());

  // Subscribe to context updates
  useEffect(() => {
    const unsubscribe = ChatBridge.subscribe((event: ChatBridgeEvent) => {
      if (event.type === 'context:update') {
        setClientContext(event.payload);
      }
    });

    return unsubscribe;
  }, []);

  const injectContext = useCallback((key: keyof ClientContext, data: any) => {
    ChatBridge.injectContext(key, data);
  }, []);

  const removeContext = useCallback((key: keyof ClientContext) => {
    ChatBridge.removeContext(key);
  }, []);

  const executeCommand = useCallback((command: ChatCommand) => {
    ChatBridge.executeCommand(command);
  }, []);

  const subscribeToCommands = useCallback((callback: (command: ChatCommand) => void) => {
    return ChatBridge.subscribe((event: ChatBridgeEvent) => {
      if (event.type === 'command:execute') {
        callback(event.payload);
      }
    });
  }, []);

  const clearContext = useCallback(() => {
    ChatBridge.clearContext();
  }, []);

  const value: ChatBridgeContextValue = {
    clientContext,
    injectContext,
    removeContext,
    executeCommand,
    subscribeToCommands,
    clearContext,
  };

  return (
    <ChatBridgeContext.Provider value={value}>
      {children}
    </ChatBridgeContext.Provider>
  );
}

/**
 * Hook to access the ChatBridge context.
 */
export function useChatBridgeContext(): ChatBridgeContextValue {
  const context = useContext(ChatBridgeContext);
  if (!context) {
    throw new Error('useChatBridgeContext must be used within a ChatBridgeProvider');
  }
  return context;
}
