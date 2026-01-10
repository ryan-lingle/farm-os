/**
 * Floating chat button component.
 * Opens the chat panel when clicked.
 */

import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatButtonProps {
  onClick: () => void;
  hasUnread?: boolean;
}

export function ChatButton({ onClick, hasUnread = false }: ChatButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
      title="Open chat"
    >
      <MessageCircle className="h-6 w-6" />
      {hasUnread && (
        <span className="absolute top-0 right-0 h-3 w-3 bg-destructive rounded-full" />
      )}
    </Button>
  );
}
