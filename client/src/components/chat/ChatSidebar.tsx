/**
 * Chat sidebar component.
 * Shows conversation history with search and filtering.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  MessageSquare,
  Archive,
  Trash2,
  MoreHorizontal,
  CheckSquare,
  FolderKanban,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  useConversations,
  useArchiveConversation,
  useDeleteConversation,
  Conversation,
} from '@/hooks/useConversations';

interface ChatSidebarProps {
  selectedId?: string;
  onNewChat: () => void;
  onSelectConversation: (conversation: Conversation) => void;
}

export function ChatSidebar({
  selectedId,
  onNewChat,
  onSelectConversation,
}: ChatSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { conversations, isLoading } = useConversations({ status: 'active' });
  const archiveConversation = useArchiveConversation();
  const deleteConversation = useDeleteConversation();

  const filteredConversations = conversations.filter((conv) => {
    const title = conv.title || conv.defaultTitle || 'New conversation';
    return title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const handleArchive = (e: React.MouseEvent, conv: Conversation) => {
    e.stopPropagation();
    archiveConversation.mutate(conv.id);
  };

  const handleDelete = (e: React.MouseEvent, conv: Conversation) => {
    e.stopPropagation();
    deleteConversation.mutate(conv.id);
  };

  return (
    <div className="w-72 border-r bg-muted/30 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <Button onClick={onNewChat} className="w-full" variant="default">
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Search */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
      </div>

      {/* Conversations list */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Loading...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchTerm ? 'No conversations found' : 'No conversations yet'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => onSelectConversation(conv)}
                  className={cn(
                    'group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                    selectedId === conv.id
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50'
                  )}
                >
                  <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">
                        {conv.title || conv.defaultTitle || 'New conversation'}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDate(conv.updatedAt)}
                      </span>
                    </div>
                    {/* Context badge */}
                    {conv.hasContext && (
                      <div className="flex items-center gap-1 mt-1">
                        {conv.contextType === 'task' && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            <CheckSquare className="h-3 w-3" />
                            Task
                          </span>
                        )}
                        {conv.contextType === 'plan' && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            <FolderKanban className="h-3 w-3" />
                            Plan
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => handleArchive(e as any, conv)}>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => handleDelete(e as any, conv)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
