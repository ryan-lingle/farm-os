/**
 * Chat panel component.
 * Main chat interface containing messages and input.
 * Full-panel drop zone for image uploads.
 */

import { useState, useEffect, useRef, useCallback, DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, X, Upload, Expand, Info, Mountain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import type { ChatMessage as ChatMessageType, ChatImage } from '@/types/chat';

interface PageContextInfo {
  entityName: string | null;
  entityType: string | null;
  hasTopography?: boolean;
}

interface ChatPanelProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  error: string | null;
  onSend: (message: string, images?: ChatImage[]) => void;
  onClose: () => void;
  onClear: () => void;
  pageContext?: PageContextInfo;
}

export function ChatPanel({
  messages,
  isLoading,
  error,
  onSend,
  onClose,
  onClear,
  pageContext,
}: ChatPanelProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const dragCounterRef = useRef(0);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;

    // Check if dragging files
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;

    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );

    if (files.length > 0) {
      setDroppedFiles(files);
    }
  }, []);

  const handleExternalImagesProcessed = useCallback(() => {
    setDroppedFiles([]);
  }, []);

  return (
    <div
      className="flex flex-col h-full bg-background border rounded-lg shadow-lg overflow-hidden relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-sm">Farm Assistant</h2>
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              onClose();
              navigate('/chat');
            }}
            title="Open full screen"
          >
            <Expand className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Context indicator */}
      {pageContext?.entityName && (
        <div className="px-4 py-2 border-b bg-blue-50 dark:bg-blue-950/30">
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
            <Info className="h-3.5 w-3.5" />
            <span className="flex items-center gap-2 flex-wrap">
              <span>
                Chatting about{' '}
                <span className="font-medium">{pageContext.entityName}</span>
              </span>
              {pageContext.entityType && (
                <Badge variant="secondary" className="text-xs capitalize">
                  {pageContext.entityType}
                </Badge>
              )}
              {pageContext.hasTopography && (
                <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                  <Mountain className="h-3 w-3 mr-1" />
                  Topography
                </Badge>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            {pageContext?.entityName ? (
              <>
                <p className="text-sm">
                  Ask me about <span className="font-medium text-foreground">{pageContext.entityName}</span>
                </p>
                <p className="text-xs mt-2">
                  I have context about this {pageContext.entityType || 'item'}
                  {pageContext.hasTopography && ' including elevation and slope data'}
                  {' '}and can help with related tasks.
                </p>
                {pageContext.hasTopography && (
                  <p className="text-xs mt-1 text-green-600 dark:text-green-400">
                    Try: "Where would be the best place for a pond?"
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm">Ask me anything about your farm!</p>
                <p className="text-xs mt-2">
                  I can help you view assets, create logs, move animals, and more.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted text-muted-foreground rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSend={onSend}
        disabled={isLoading}
        externalImages={droppedFiles}
        onExternalImagesProcessed={handleExternalImagesProcessed}
      />

      {/* Drop overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-2 text-primary">
            <Upload className="h-8 w-8" />
            <span className="font-medium">Drop images here</span>
          </div>
        </div>
      )}
    </div>
  );
}
