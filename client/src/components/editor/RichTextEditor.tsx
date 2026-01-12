/**
 * RichTextEditor - TipTap-based WYSIWYG editor
 * Linear-inspired invisible editor - toolbar appears on focus
 * Supports entity mentions via slash commands (/asset, /location, etc.)
 */

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  Minus,
} from 'lucide-react';
import { MentionExtension, type MentionAttributes } from './extensions/MentionExtension';
import {
  SlashCommandExtension,
  deactivateSlashCommand,
  setSelectedType,
  type SlashCommandState,
} from './extensions/SlashCommandExtension';
import { SlashCommandMenu } from './SlashCommandMenu';
import { EntitySearchPopover } from './EntitySearchPopover';
import type { EntityType } from '@/lib/api';

interface RichTextEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  autoFocus?: boolean;
  /** Hide toolbar and border for seamless editing (Linear-style) */
  minimal?: boolean;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}

function ToolbarButton({ onClick, isActive, disabled, children, title }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        'h-8 w-8',
        isActive && 'bg-accent text-accent-foreground'
      )}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      disabled={disabled}
      title={title}
    >
      {children}
    </Button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-border mx-1" />;
}

interface EditorToolbarProps {
  editor: Editor | null;
  /** Use minimal styling (no border/background) for floating toolbar */
  minimal?: boolean;
}

function EditorToolbar({ editor, minimal = false }: EditorToolbarProps) {
  if (!editor) return null;

  const addImage = useCallback(() => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  return (
    <div className={cn(
      'flex items-center gap-0.5 flex-wrap',
      minimal ? '' : 'p-2 border-b border-border bg-muted/30'
    )}>
      {/* Undo/Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo"
      >
        <Undo className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo"
      >
        <Redo className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Text formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        title="Inline Code"
      >
        <Code className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        isActive={editor.isActive('taskList')}
        title="Task List"
      >
        <ListTodo className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="Quote"
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Links & Media */}
      <ToolbarButton
        onClick={setLink}
        isActive={editor.isActive('link')}
        title="Add Link"
      >
        <LinkIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={addImage} title="Add Image">
        <ImageIcon className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Horizontal Rule */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Line"
      >
        <Minus className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}

export function RichTextEditor({
  content = '',
  onChange,
  onBlur,
  placeholder = 'Write something...',
  editable = true,
  className,
  autoFocus = false,
  minimal = false,
}: RichTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isToolbarActive, setIsToolbarActive] = useState(false);
  const [slashCommandState, setSlashCommandState] = useState<SlashCommandState>({
    active: false,
    query: '',
    range: null,
    selectedType: null,
  });

  // Show toolbar when editor is focused OR user is interacting with toolbar
  const showToolbar = isFocused || isToolbarActive;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline underline-offset-2 hover:text-primary/80',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Typography,
      TaskList.configure({
        HTMLAttributes: {
          class: 'not-prose pl-0 list-none',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'flex items-start gap-2 my-1',
        },
      }),
      // Entity mention support
      MentionExtension,
      SlashCommandExtension.configure({
        onStateChange: setSlashCommandState,
      }),
    ],
    content,
    editable,
    autofocus: autoFocus,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    onFocus: () => {
      setIsFocused(true);
    },
    onBlur: () => {
      setIsFocused(false);
      onBlur?.();
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm sm:prose-base max-w-none',
          // Headings - Linear-style sizing (larger, more distinct)
          'prose-headings:font-semibold prose-headings:text-foreground prose-headings:leading-tight prose-headings:tracking-tight',
          '[&_h1]:text-[1.75rem] [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-4',
          '[&_h2]:text-[1.375rem] [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-3',
          '[&_h3]:text-[1.125rem] [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2',
          // Paragraphs
          'prose-p:text-foreground prose-p:leading-relaxed prose-p:my-2',
          // Bold/italic
          'prose-strong:text-foreground prose-strong:font-semibold',
          'prose-em:text-foreground',
          // Code
          'prose-code:text-foreground prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono',
          'prose-pre:bg-muted prose-pre:rounded-lg prose-pre:p-4',
          // Blockquote
          'prose-blockquote:border-l-4 prose-blockquote:border-border prose-blockquote:pl-4 prose-blockquote:text-muted-foreground prose-blockquote:italic prose-blockquote:my-4',
          // Lists
          'prose-ul:list-disc prose-ul:pl-6 prose-ul:my-2',
          'prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-2',
          'prose-li:my-1',
          // Focus
          'focus:outline-none min-h-[200px] p-4'
        ),
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            const reader = new FileReader();
            reader.onload = () => {
              const url = reader.result as string;
              const { tr, schema } = view.state;
              const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
              if (pos) {
                const node = schema.nodes.image.create({ src: url });
                const transaction = tr.insert(pos.pos, node);
                view.dispatch(transaction);
              }
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                  const url = reader.result as string;
                  const { tr, schema, selection } = view.state;
                  const node = schema.nodes.image.create({ src: url });
                  const transaction = tr.insert(selection.from, node);
                  view.dispatch(transaction);
                };
                reader.readAsDataURL(file);
              }
              return true;
            }
          }
        }
        return false;
      },
    },
  });

  // Update content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  // Handle entity type selection from slash command menu
  const handleSelectEntityType = useCallback(
    (type: EntityType) => {
      if (!editor) return;
      setSelectedType(editor, type);
    },
    [editor]
  );

  // Handle mention insertion
  const handleInsertMention = useCallback(
    (attrs: MentionAttributes) => {
      if (!editor) return;

      // Insert the mention node
      editor.commands.insertMention(attrs);

      // Deactivate slash command mode
      deactivateSlashCommand(editor);

      // Focus editor and add a space after the mention
      editor.chain().focus().insertContent(' ').run();
    },
    [editor]
  );

  // Handle canceling the search
  const handleCancelSearch = useCallback(() => {
    if (!editor) return;
    deactivateSlashCommand(editor);
    editor.commands.focus();
  }, [editor]);

  // Render the slash command menus
  const renderSlashCommandMenus = () => {
    if (!editor || !editable) return null;

    return (
      <>
        {/* Entity type selection menu */}
        <SlashCommandMenu
          editor={editor}
          state={slashCommandState}
          onSelectType={handleSelectEntityType}
        />
        {/* Entity search popover */}
        <EntitySearchPopover
          editor={editor}
          state={slashCommandState}
          onInsertMention={handleInsertMention}
          onCancel={handleCancelSearch}
        />
      </>
    );
  };

  // Minimal mode: no border, toolbar only on focus (Linear-style)
  if (minimal) {
    return (
      <div className={cn('relative', className)}>
        {/* Floating toolbar - visible when editor focused or interacting with toolbar */}
        {editable && showToolbar && (
          <div
            className="sticky top-0 z-10 mb-4 -mx-4 px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/50"
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setIsToolbarActive(true)}
            onMouseLeave={() => setIsToolbarActive(false)}
          >
            <EditorToolbar editor={editor} minimal />
          </div>
        )}
        <EditorContent editor={editor} />
        {renderSlashCommandMenus()}
      </div>
    );
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden bg-background', className)}>
      {editable && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
      {renderSlashCommandMenus()}
    </div>
  );
}

export default RichTextEditor;
