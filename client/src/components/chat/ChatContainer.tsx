/**
 * Chat container component.
 * Manages the chat panel open/close state and positioning.
 */

import { useState } from 'react';
import { useChat } from '@/hooks/useChat';
import { ChatButton } from './ChatButton';
import { ChatPanel } from './ChatPanel';

export function ChatContainer() {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, isLoading, error, sendMessage, clearMessages, clearError } = useChat();

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
