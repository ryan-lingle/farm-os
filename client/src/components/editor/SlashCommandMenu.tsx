/**
 * SlashCommandMenu - Shows entity type options when user types `/`
 *
 * Uses cmdk for keyboard navigation and filtering.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Editor } from '@tiptap/core';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { slashCommands, entityIcons, entityColors } from '@/lib/entityIcons';
import type { EntityType } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  slashCommandPluginKey,
  deactivateSlashCommand,
  type SlashCommandState,
} from './extensions/SlashCommandExtension';

interface SlashCommandMenuProps {
  editor: Editor;
  state: SlashCommandState;
  onSelectType: (type: EntityType) => void;
}

export function SlashCommandMenu({ editor, state, onSelectType }: SlashCommandMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Calculate menu position based on cursor location
  useEffect(() => {
    if (!state.active || !state.range) return;

    const { view } = editor;
    const coords = view.coordsAtPos(state.range.from);

    // Position below the slash character
    setPosition({
      top: coords.bottom + 8,
      left: coords.left,
    });
  }, [editor, state.active, state.range]);

  // Filter commands based on query
  const filteredCommands = slashCommands.filter((cmd) => {
    if (!state.query) return true;
    const query = state.query.toLowerCase();
    return (
      cmd.command.toLowerCase().includes(query) ||
      cmd.label.toLowerCase().includes(query) ||
      cmd.description.toLowerCase().includes(query)
    );
  });

  const handleSelect = useCallback(
    (type: EntityType) => {
      // Delete the slash command text before inserting
      if (state.range) {
        editor
          .chain()
          .focus()
          .deleteRange({ from: state.range.from, to: state.range.to })
          .run();
      }
      onSelectType(type);
    },
    [editor, state.range, onSelectType]
  );

  const handleClose = useCallback(() => {
    deactivateSlashCommand(editor);
    editor.commands.focus();
  }, [editor]);

  // Handle keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state.active) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.active, handleClose]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    if (state.active) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [state.active, handleClose]);

  if (!state.active || state.selectedType) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-50 min-w-[220px] max-w-[300px] rounded-lg border bg-popover shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      <Command className="rounded-lg" shouldFilter={false}>
        <CommandList>
          <CommandEmpty>No commands found.</CommandEmpty>
          <CommandGroup heading="Reference an entity">
            {filteredCommands.map((cmd) => {
              const Icon = entityIcons[cmd.type];
              const colors = entityColors[cmd.type];

              return (
                <CommandItem
                  key={cmd.command}
                  value={cmd.command}
                  onSelect={() => handleSelect(cmd.type)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div
                    className={cn(
                      'flex items-center justify-center h-6 w-6 rounded',
                      colors.bg,
                      colors.text
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">/{cmd.command}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {cmd.description}
                    </div>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}

export default SlashCommandMenu;
