/**
 * ErrorToast - Enhanced error notification with copy functionality
 * Shows a brief message but allows copying full error details for debugging
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Check, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorDetails {
  message: string;
  code?: string;
  status?: number;
  endpoint?: string;
  stack?: string;
  data?: unknown;
  timestamp: string;
}

/**
 * Create copyable error details string
 */
function formatErrorForCopy(details: ErrorDetails): string {
  return JSON.stringify({
    timestamp: details.timestamp,
    message: details.message,
    code: details.code,
    status: details.status,
    endpoint: details.endpoint,
    data: details.data,
    stack: details.stack,
  }, null, 2);
}

/**
 * Expandable error toast content
 */
function ErrorToastContent({
  message,
  details,
}: {
  message: string;
  details: ErrorDetails;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(formatErrorForCopy(details));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{message}</p>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1"
          >
            {expanded ? 'Hide' : 'Show'} details
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 shrink-0"
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
      {expanded && (
        <div className="mt-2 pt-2 border-t">
          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-32 overflow-y-auto font-mono">
            {formatErrorForCopy(details)}
          </pre>
        </div>
      )}
    </div>
  );
}

/**
 * Show an error toast with copy-able details
 */
export function showErrorToast(
  message: string,
  options?: {
    code?: string;
    status?: number;
    endpoint?: string;
    stack?: string;
    data?: unknown;
    duration?: number;
  }
) {
  const details: ErrorDetails = {
    message,
    code: options?.code,
    status: options?.status,
    endpoint: options?.endpoint,
    stack: options?.stack,
    data: options?.data,
    timestamp: new Date().toISOString(),
  };

  toast.error(
    <ErrorToastContent message={message} details={details} />,
    {
      duration: options?.duration ?? 8000,
      className: 'error-toast-with-details',
    }
  );
}

/**
 * Utility to extract error details from various error types
 */
export function extractErrorDetails(error: unknown): {
  message: string;
  code?: string;
  status?: number;
  data?: unknown;
  stack?: string;
} {
  if (error instanceof Error) {
    const apiError = error as Error & {
      status?: number;
      code?: string;
      data?: unknown;
    };
    return {
      message: error.message,
      code: apiError.code,
      status: apiError.status,
      data: apiError.data,
      stack: error.stack,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>;
    return {
      message: String(obj.message || obj.error || 'Unknown error'),
      code: obj.code as string | undefined,
      status: obj.status as number | undefined,
      data: obj.data,
    };
  }

  return {
    message: String(error),
  };
}

/**
 * Helper to show error from any error type
 */
export function showError(error: unknown, context?: string) {
  const details = extractErrorDetails(error);
  const message = context
    ? `${context}: ${details.message}`
    : details.message;

  showErrorToast(message, details);
}
