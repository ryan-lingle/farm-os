/**
 * EntitySearchPopover - Search UI for finding specific entities
 *
 * Shows after user selects an entity type from the slash command menu.
 * Allows searching and selecting a specific entity to insert as a mention.
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
import { Loader2 } from 'lucide-react';
import { entityIcons, entityColors, entityTypeNames } from '@/lib/entityIcons';
import { useEntitySearch } from '@/hooks/useEntitySearch';
import type { EntityType, SearchResult } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  deactivateSlashCommand,
  type SlashCommandState,
} from './extensions/SlashCommandExtension';
import type { MentionAttributes } from './extensions/MentionExtension';

interface EntitySearchPopoverProps {
  editor: Editor;
  state: SlashCommandState;
  onInsertMention: (attrs: MentionAttributes) => void;
  onCancel: () => void;
}

export function EntitySearchPopover({
  editor,
  state,
  onInsertMention,
  onCancel,
}: EntitySearchPopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [inputValue, setInputValue] = useState('');

  const { results, isLoading, search, clearResults } = useEntitySearch({
    types: state.selectedType ? [state.selectedType] : undefined,
    limit: 10,
    debounceMs: 150,
    minQueryLength: 0, // Show recent items with empty query
  });

  // Calculate position
  useEffect(() => {
    if (!state.active || !state.selectedType) return;

    const { view } = editor;
    const { from } = view.state.selection;
    const coords = view.coordsAtPos(from);

    setPosition({
      top: coords.bottom + 8,
      left: coords.left,
    });
  }, [editor, state.active, state.selectedType]);

  // Focus input when opened
  useEffect(() => {
    if (state.selectedType && inputRef.current) {
      inputRef.current.focus();
      // Trigger initial search for recent items
      search('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedType]); // Only run when selectedType changes, not when search fn updates

  // Handle input change
  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);
      search(value);
    },
    [search]
  );

  // Handle item selection
  const handleSelect = useCallback(
    (result: SearchResult) => {
      onInsertMention({
        type: result.type,
        id: result.id.toString(),
        label: result.name,
        assetType: result.asset_type,
      });
      clearResults();
      setInputValue('');
    },
    [onInsertMention, clearResults]
  );

  // Handle close
  const handleClose = useCallback(() => {
    clearResults();
    setInputValue('');
    onCancel();
  }, [clearResults, onCancel]);

  // Handle keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state.selectedType) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedType, handleClose]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    if (state.selectedType) {
      // Delay adding listener to prevent immediate close
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [state.selectedType, handleClose]);

  if (!state.active || !state.selectedType) return null;

  const selectedTypeName = entityTypeNames[state.selectedType];
  const SelectedIcon = entityIcons[state.selectedType];
  const selectedColors = entityColors[state.selectedType];

  return (
    <div
      ref={containerRef}
      className="fixed z-50 min-w-[280px] max-w-[400px] rounded-lg border bg-popover shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      <Command className="rounded-lg" shouldFilter={false}>
        <div className="flex items-center gap-2 px-3 py-2 border-b">
          <div
            className={cn(
              'flex items-center justify-center h-5 w-5 rounded',
              selectedColors.bg,
              selectedColors.text
            )}
          >
            <SelectedIcon className="h-3 w-3" />
          </div>
          <span className="text-sm font-medium">Search {selectedTypeName}s</span>
        </div>
        <CommandInput
          ref={inputRef}
          value={inputValue}
          onValueChange={handleInputChange}
          placeholder={`Search for a ${selectedTypeName.toLowerCase()}...`}
          className="border-none focus:ring-0"
        />
        <CommandList>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
            </div>
          ) : !results || results.length === 0 ? (
            <CommandEmpty>
              {inputValue
                ? `No ${selectedTypeName.toLowerCase()}s found.`
                : `Type to search ${selectedTypeName.toLowerCase()}s`}
            </CommandEmpty>
          ) : (
            <CommandGroup>
              {results.map((result) => {
                const Icon = entityIcons[result.asset_type || result.type];
                const colors = entityColors[result.asset_type || result.type];

                return (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    value={`${result.type}-${result.id}`}
                    onSelect={() => handleSelect(result)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <div
                      className={cn(
                        'flex items-center justify-center h-6 w-6 rounded flex-shrink-0',
                        colors.bg,
                        colors.text
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{result.name}</div>
                      {(result.asset_type || result.state || result.status) && (
                        <div className="text-xs text-muted-foreground truncate capitalize">
                          {result.asset_type || result.state || result.status}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </div>
  );
}

export default EntitySearchPopover;
