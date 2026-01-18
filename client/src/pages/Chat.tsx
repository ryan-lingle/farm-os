/**
 * Full-screen Chat page.
 * ChatGPT-style interface with conversation history sidebar.
 */

import { useState, useEffect, useRef, useCallback, useMemo, DragEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Upload, FileText, FolderKanban, MapPin, ClipboardList, Package } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { useChat } from '@/hooks/useChat';
import {
  useConversation,
  useCreateConversation,
  useUpdateConversation,
  Conversation,
} from '@/hooks/useConversations';
import { useTask, useTasks } from '@/hooks/useTasks';
import { usePlan } from '@/hooks/usePlans';
import { useAsset } from '@/hooks/useAssets';
import { useLocation } from '@/hooks/useLocations';
import { useLog } from '@/hooks/useLogs';
import {
  buildTaskContext,
  buildPlanContext,
  buildAssetContext,
  buildLocationContext,
  buildLogContext,
  getTaskSummary,
  getPlanSummary,
  getAssetSummary,
  getLocationSummary,
  getLogSummary,
  getTaskExampleQuestions,
  getPlanExampleQuestions,
  getAssetExampleQuestions,
  getLocationExampleQuestions,
  getLogExampleQuestions,
} from '@/lib/chat-context';
import type { ChatImage } from '@/types/chat';
import type { ChatContext } from '@/lib/chat-api';

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

export default function Chat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const dragCounterRef = useRef(0);
  const [hasLoadedMessages, setHasLoadedMessages] = useState(false);

  // Conversation metadata
  const { data: currentConversation, isLoading: conversationLoading } = useConversation(id);

  // Fetch context resource data based on conversation's context type
  const taskId = currentConversation?.taskId?.toString();
  const planId = currentConversation?.planId?.toString();
  const assetId = currentConversation?.assetId?.toString();
  const assetType = currentConversation?.assetType || 'animal';
  const locationId = currentConversation?.locationId?.toString();
  const logId = currentConversation?.logId?.toString();
  const logType = currentConversation?.logType || 'activity';

  const { data: contextTask } = useTask(taskId);
  const { data: contextPlan } = usePlan(planId ? parseInt(planId, 10) : undefined);
  const { data: contextAsset } = useAsset(assetType, assetId || '');
  const { data: contextLocation } = useLocation(locationId);
  const { data: contextLog } = useLog(logType, logId || '');

  // Only fetch plan tasks when we have a planId
  const planIdNum = planId ? parseInt(planId, 10) : undefined;
  const { tasks: planTasks } = useTasks(planIdNum ? { plan_id: planIdNum } : { plan_id: -1 });

  // Build chat context from resource data
  const chatContext = useMemo<ChatContext | undefined>(() => {
    if (contextTask) {
      return buildTaskContext(contextTask);
    }
    if (contextPlan && planIdNum) {
      return buildPlanContext(contextPlan, planTasks);
    }
    if (contextAsset) {
      return buildAssetContext(contextAsset);
    }
    if (contextLocation) {
      return buildLocationContext(contextLocation);
    }
    if (contextLog) {
      return buildLogContext(contextLog);
    }
    return undefined;
  }, [contextTask, contextPlan, planTasks, planIdNum, contextAsset, contextLocation, contextLog]);

  // Build summary and example questions based on context type
  const contextSummary = useMemo<string | undefined>(() => {
    if (contextTask) return getTaskSummary(contextTask);
    if (contextPlan) return getPlanSummary(contextPlan, planTasks);
    if (contextAsset) return getAssetSummary(contextAsset);
    if (contextLocation) return getLocationSummary(contextLocation);
    if (contextLog) return getLogSummary(contextLog);
    return undefined;
  }, [contextTask, contextPlan, planTasks, contextAsset, contextLocation, contextLog]);

  const exampleQuestions = useMemo<string[]>(() => {
    if (contextTask) return getTaskExampleQuestions(contextTask);
    if (contextPlan) return getPlanExampleQuestions(contextPlan, planTasks);
    if (contextAsset) return getAssetExampleQuestions(contextAsset);
    if (contextLocation) return getLocationExampleQuestions(contextLocation);
    if (contextLog) return getLogExampleQuestions(contextLog);
    return [];
  }, [contextTask, contextPlan, planTasks, contextAsset, contextLocation, contextLog]);

  // Chat state - pass conversationId and context for message persistence
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    loadMessages,
    clearMessages,
  } = useChat({ conversationId: id, context: chatContext });
  const createConversation = useCreateConversation();
  const updateConversation = useUpdateConversation();

  // Load messages from conversation when it's fetched
  useEffect(() => {
    if (currentConversation && !hasLoadedMessages) {
      const savedMessages = currentConversation.messages || [];
      if (savedMessages.length > 0) {
        loadMessages(savedMessages);
      }
      setHasLoadedMessages(true);
    }
  }, [currentConversation, hasLoadedMessages, loadMessages]);

  // Reset hasLoadedMessages when conversation changes
  useEffect(() => {
    setHasLoadedMessages(false);
    clearMessages();
  }, [id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  const handleNewChat = useCallback(async () => {
    // Create a new conversation
    const conv = await createConversation.mutateAsync({});
    navigate(`/chat/${conv.id}`);
    clearMessages();
  }, [createConversation, navigate, clearMessages]);

  const handleSelectConversation = useCallback((conversation: Conversation) => {
    navigate(`/chat/${conversation.id}`);
  }, [navigate]);

  const handleSend = useCallback(async (message: string, images?: ChatImage[]) => {
    // If no conversation selected, create one first
    if (!id) {
      const conv = await createConversation.mutateAsync({
        title: generateTitle(message),
      });
      navigate(`/chat/${conv.id}`, { replace: true });
    } else if (!currentConversation?.title && messages.length === 0) {
      // Update title with first message if not set
      updateConversation.mutate({
        id,
        updates: { title: generateTitle(message) },
      });
    }

    // Send the message - pass chatContext directly to avoid closure issues
    await sendMessage(message, images, chatContext);
  }, [id, currentConversation, messages.length, createConversation, navigate, updateConversation, sendMessage, chatContext]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
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
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Sidebar */}
      <ChatSidebar
        selectedId={id}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
      />

      {/* Main chat area */}
      <div
        className="flex-1 flex flex-col relative overflow-hidden"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
          <div className="max-w-3xl mx-auto p-6">
            {!id && messages.length === 0 ? (
              // Empty state for new conversation
              <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold mb-2">Farm Assistant</h2>
                <p className="text-muted-foreground max-w-md">
                  Ask me anything about your farm! I can help you view assets,
                  create logs, move animals, track harvests, and more.
                </p>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="p-3 bg-muted rounded-lg text-left">
                    <span className="font-medium">"Show me all my animals"</span>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-left">
                    <span className="font-medium">"Record 30 eggs harvested"</span>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-left">
                    <span className="font-medium">"Move chickens to pasture"</span>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-left">
                    <span className="font-medium">"What's my farm summary?"</span>
                  </div>
                </div>
              </div>
            ) : conversationLoading ? (
              // Loading state for conversation
              <div className="flex flex-col items-center justify-center h-[60vh] text-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p>Loading conversation...</p>
              </div>
            ) : messages.length === 0 && id && hasLoadedMessages ? (
              // Empty state for selected conversation with no messages
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                {chatContext && (
                  <>
                    {/* Context Header Card */}
                    <div className="mb-4 p-4 bg-muted rounded-lg text-left max-w-lg w-full">
                      <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                        {chatContext.type === 'task' && <FileText className="h-4 w-4" />}
                        {chatContext.type === 'plan' && <FolderKanban className="h-4 w-4" />}
                        {chatContext.type === 'asset' && <Package className="h-4 w-4" />}
                        {chatContext.type === 'location' && <MapPin className="h-4 w-4" />}
                        {chatContext.type === 'log' && <ClipboardList className="h-4 w-4" />}
                        <span className="capitalize">Chatting about {chatContext.type}</span>
                      </div>
                      <p className="text-sm font-medium">
                        {chatContext.type === 'task' && contextTask?.title}
                        {chatContext.type === 'plan' && contextPlan?.name}
                        {chatContext.type === 'asset' && contextAsset?.attributes.name}
                        {chatContext.type === 'location' && contextLocation?.name}
                        {chatContext.type === 'log' && contextLog?.attributes.name}
                      </p>
                    </div>

                    {/* Summary */}
                    {contextSummary && (
                      <div className="mb-6 text-sm text-muted-foreground max-w-lg text-left px-4">
                        <p
                          dangerouslySetInnerHTML={{
                            __html: contextSummary
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\*(.*?)\*/g, '<em>$1</em>'),
                          }}
                        />
                      </div>
                    )}

                    {/* Example Questions */}
                    {exampleQuestions.length > 0 && (
                      <div className="w-full max-w-lg">
                        <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide">
                          Try asking
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {exampleQuestions.map((question, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSend(question)}
                              className="p-3 bg-muted hover:bg-muted/80 rounded-lg text-left text-sm transition-colors cursor-pointer"
                            >
                              "{question}"
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
                {!chatContext && (
                  <p className="text-muted-foreground">Start the conversation</p>
                )}
              </div>
            ) : (
              // Messages list
              <div className="flex flex-col gap-4">
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
          </div>
        </ScrollArea>

        {/* Error message */}
        {error && (
          <div className="px-6 py-2 bg-destructive/10 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        {/* Input */}
        <div className="border-t bg-background">
          <div className="max-w-3xl mx-auto">
            <ChatInput
              onSend={handleSend}
              disabled={isLoading}
              placeholder="Message Farm Assistant..."
              externalImages={droppedFiles}
              onExternalImagesProcessed={handleExternalImagesProcessed}
            />
          </div>
        </div>

        {/* Drop overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-2 text-primary">
              <Upload className="h-8 w-8" />
              <span className="font-medium">Drop images here</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
