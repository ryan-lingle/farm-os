/**
 * Chat message component.
 * Renders a single message bubble with appropriate styling based on role.
 * Supports markdown rendering for rich text content.
 * Includes copy-pasteable error details when tool calls fail.
 */

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Copy, Check, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChatMessage as ChatMessageType, ToolCall } from '@/types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
}

/**
 * Extract errors from tool calls for display.
 */
function getToolCallErrors(toolCalls?: ToolCall[]): Array<{ name: string; error: string; details: string }> {
  if (!toolCalls) return [];

  return toolCalls
    .filter(tc => tc.error || (tc.result && (tc.result as Record<string, unknown>).success === false))
    .map(tc => {
      const result = tc.result as Record<string, unknown> | undefined;
      const errorMessage = tc.error || result?.error as string || 'Unknown error';
      const errorCode = result?.error_code as string || 'UNKNOWN_ERROR';

      // Create a copy-pasteable debug string
      const debugDetails = JSON.stringify({
        tool: tc.name,
        arguments: tc.arguments,
        error_code: errorCode,
        error: errorMessage,
        result: tc.result,
      }, null, 2);

      return {
        name: tc.name,
        error: errorMessage,
        details: debugDetails,
      };
    });
}

function ErrorDetails({ errors }: { errors: Array<{ name: string; error: string; details: string }> }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (errors.length === 0) return null;

  const allDetails = errors.map(e => e.details).join('\n\n---\n\n');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(allDetails);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-2 border-t border-destructive/20 pt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80"
      >
        <AlertCircle className="h-3 w-3" />
        <span>{errors.length} tool error{errors.length > 1 ? 's' : ''}</span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Debug info (copy to share):</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <pre className="text-xs bg-black/10 dark:bg-white/10 p-2 rounded overflow-x-auto max-h-48 overflow-y-auto font-mono">
            {allDetails}
          </pre>
        </div>
      )}
    </div>
  );
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const errors = getToolCallErrors(message.toolCalls);

  return (
    <div
      className={cn(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-2',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {/* Images */}
        {message.images && message.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.images.map((image) => (
              <img
                key={image.id}
                src={image.data}
                alt={image.name}
                className="max-w-full max-h-48 rounded-md object-cover"
              />
            ))}
          </div>
        )}
        {message.content && (
          <div className={cn(
            'text-sm prose prose-sm max-w-none',
            // Style markdown elements
            'prose-p:my-1 prose-p:leading-relaxed',
            'prose-headings:font-semibold prose-headings:my-2',
            'prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5',
            'prose-code:bg-black/10 prose-code:dark:bg-white/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none',
            'prose-pre:bg-black/10 prose-pre:dark:bg-white/10 prose-pre:p-2 prose-pre:rounded prose-pre:my-2',
            'prose-a:text-primary prose-a:underline prose-a:hover:no-underline',
            'prose-blockquote:border-l-2 prose-blockquote:border-current prose-blockquote:pl-3 prose-blockquote:italic prose-blockquote:my-2',
            // Inherit text color from parent
            isUser
              ? '[&_*]:text-primary-foreground'
              : '[&_*]:text-foreground prose-strong:text-foreground'
          )}>
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
        {!isUser && <ErrorDetails errors={errors} />}
      </div>
    </div>
  );
}
