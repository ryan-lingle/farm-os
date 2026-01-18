/**
 * Chat container component.
 * Manages the chat panel open/close state and positioning.
 *
 * Behavior:
 * - Starts fresh on each page refresh (no message loading)
 * - Creates a NEW conversation on first message (saved to database)
 * - Past conversations are accessible from the main /chat page
 */

import { useState, useCallback } from 'react';
import { useChat } from '@/hooks/useChat';
import {
  useCreateConversation,
  useUpdateConversation,
} from '@/hooks/useConversations';
import { ChatButton } from './ChatButton';
import { ChatPanel } from './ChatPanel';

// Generate a short title from the first message (ChatGPT-style)
function generateTitle(message: string): string {
  // Remove extra whitespace and limit length
  const cleaned = message.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= 40) return cleaned;
  // Cut at word boundary
  const truncated = cleaned.slice(0, 40);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 20 ? truncated.slice(0, lastSpace) + '...' : truncated + '...';
}

export function ChatContainer() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setLocalConversationId] = useState<string | null>(null);

  const createConversation = useCreateConversation();
  const updateConversation = useUpdateConversation();

  // Chat hook - starts fresh, no conversation ID initially
  const {
    messages,
    isLoading,
    error,
    sendMessage: originalSendMessage,
    clearMessages,
    clearError,
    setConversationId,
  } = useChat({ conversationId: conversationId || undefined });

  // Create a new conversation on first message
  const ensureConversation = useCallback(async () => {
    if (conversationId) return conversationId;

    // Create a new conversation for this bubble session
    const conv = await createConversation.mutateAsync({
      title: 'New Chat',
    });
    setLocalConversationId(conv.id);
    setConversationId(conv.id);
    return conv.id;
  }, [conversationId, createConversation, setConversationId]);

  // Wrapped sendMessage that ensures conversation exists and auto-generates title
  const sendMessage = useCallback(async (message: string, images?: any[]) => {
    const convId = await ensureConversation();

    // Auto-generate title from first message (ChatGPT-style)
    const isFirstMessage = messages.length === 0;
    if (isFirstMessage && message.trim()) {
      const title = generateTitle(message);
      updateConversation.mutate({ id: convId, updates: { title } });
    }

    return originalSendMessage(message, images);
  }, [ensureConversation, originalSendMessage, messages.length, updateConversation]);

  const handleClose = () => {
    setIsOpen(false);
    clearError();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="w-[480px] h-[600px] animate-in slide-in-from-bottom-2 fade-in duration-200">
          <ChatPanel
            messages={messages}
            isLoading={isLoading}
            error={error}
            onSend={sendMessage}
            onClose={handleClose}
            onClear={clearMessages}
          />
        </div>
      ) : (
        <ChatButton onClick={() => setIsOpen(true)} />
      )}
    </div>
  );
}
