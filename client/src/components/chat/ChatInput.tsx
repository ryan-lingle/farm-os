/**
 * Chat input component.
 * Text input with send button for composing messages.
 * Supports image paste and file selection.
 */

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { Send, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { ChatImage } from '@/types/chat';

interface ChatInputProps {
  onSend: (message: string, images?: ChatImage[]) => void;
  disabled?: boolean;
  placeholder?: string;
  /** External images to add (from drag/drop on parent) */
  externalImages?: File[];
  /** Called when external images have been processed */
  onExternalImagesProcessed?: () => void;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Ask about your farm...',
  externalImages,
  onExternalImagesProcessed,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<ChatImage[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result as string;
      const newImage: ChatImage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        data,
        name: file.name,
        type: file.type,
      };
      setImages(prev => [...prev, newImage]);
    };
    reader.readAsDataURL(file);
  }, []);

  // Process external images from drag/drop
  useEffect(() => {
    if (externalImages && externalImages.length > 0) {
      externalImages.forEach(processFile);
      onExternalImagesProcessed?.();
    }
  }, [externalImages, processFile, onExternalImagesProcessed]);

  const handleSend = () => {
    if ((message.trim() || images.length > 0) && !disabled) {
      onSend(message.trim(), images.length > 0 ? images : undefined);
      setMessage('');
      setImages([]);
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter, but allow Shift+Enter for new lines
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          processFile(file);
        }
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(processFile);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  return (
    <div className="border-t bg-background">
      {/* Image previews */}
      {images.length > 0 && (
        <div className="flex gap-2 px-4 pt-3 pb-2 overflow-x-auto">
          {images.map((image) => (
            <div key={image.id} className="relative shrink-0">
              <img
                src={image.data}
                alt={image.name}
                className="h-16 w-16 object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={() => removeImage(image.id)}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:bg-destructive/90"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-2 items-end p-4 pt-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Image upload button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 h-10 w-10"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          title="Add image"
        >
          <ImageIcon className="h-5 w-5" />
        </Button>

        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[40px] max-h-[150px] resize-none"
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={disabled || (!message.trim() && images.length === 0)}
          size="icon"
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
