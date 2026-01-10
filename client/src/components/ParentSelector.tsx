import React, { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

export interface ParentOption {
  id: string;
  name: string;
  parent_id?: number | null;
  depth?: number;
  is_leaf?: boolean;
  [key: string]: any;
}

interface ParentSelectorProps<T extends ParentOption> {
  options: T[];
  value?: string | number | null;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  emptyText?: string;
  currentItemId?: string; // ID of current item (to prevent selecting self or descendants)
  disabled?: boolean;
  className?: string;
  showDepth?: boolean;
  allowClear?: boolean;
  excludeIds?: (string | number)[]; // Additional IDs to exclude from selection
}

export function ParentSelector<T extends ParentOption>({
  options,
  value,
  onChange,
  placeholder = 'Select parent...',
  emptyText = 'No options found',
  currentItemId,
  disabled = false,
  className,
  showDepth = true,
  allowClear = true,
  excludeIds = [],
}: ParentSelectorProps<T>) {
  const [open, setOpen] = useState(false);
  
  // Filter out the current item and any descendants (if we had that info)
  const filteredOptions = options.filter((option) => {
    // Can't select self as parent
    if (currentItemId && option.id === currentItemId) {
      return false;
    }
    // Can't select explicitly excluded IDs
    if (excludeIds.includes(option.id) || excludeIds.includes(Number(option.id))) {
      return false;
    }
    return true;
  });

  // Find selected option
  const selectedOption = value
    ? filteredOptions.find((opt) => opt.id === String(value) || Number(opt.id) === value)
    : null;

  const handleSelect = (optionId: string) => {
    const selected = filteredOptions.find((opt) => opt.id === optionId);
    if (selected) {
      onChange(selected.id);
      setOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  // Group options by depth for hierarchical display
  const groupedOptions = filteredOptions.reduce((acc, option) => {
    const depth = option.depth ?? 0;
    if (!acc[depth]) {
      acc[depth] = [];
    }
    acc[depth].push(option);
    return acc;
  }, {} as Record<number, T[]>);

  // Sort by depth
  const sortedDepths = Object.keys(groupedOptions)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 flex-1 truncate">
            {selectedOption ? (
              <>
                <span className="truncate">{selectedOption.name}</span>
                {showDepth && selectedOption.depth !== undefined && (
                  <Badge variant="secondary" className="text-xs">
                    Level {selectedOption.depth}
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            {allowClear && selectedOption && (
              <X
                className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            
            {/* Option to clear selection (set to root) */}
            {allowClear && (
              <CommandGroup heading="Root Level">
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === null ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="text-muted-foreground italic">(No parent)</span>
                </CommandItem>
              </CommandGroup>
            )}

            {/* Grouped by depth */}
            {sortedDepths.map((depth) => (
              <CommandGroup key={depth} heading={`Level ${depth}`}>
                {groupedOptions[depth].map((option) => {
                  const isSelected =
                    value === option.id || Number(value) === Number(option.id);
                  
                  return (
                    <CommandItem
                      key={option.id}
                      value={`${option.id}-${option.name}`}
                      onSelect={() => handleSelect(option.id)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className="truncate flex-1">{option.name}</span>
                      {showDepth && option.depth !== undefined && (
                        <Badge variant="outline" className="text-xs ml-2">
                          L{option.depth}
                        </Badge>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Simpler version without grouping
interface SimpleParentSelectorProps<T extends ParentOption> {
  options: T[];
  value?: string | number | null;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  emptyText?: string;
  currentItemId?: string;
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;
  renderOption?: (option: T) => React.ReactNode;
}

export function SimpleParentSelector<T extends ParentOption>({
  options,
  value,
  onChange,
  placeholder = 'Select parent...',
  emptyText = 'No options found',
  currentItemId,
  disabled = false,
  className,
  allowClear = true,
  renderOption,
}: SimpleParentSelectorProps<T>) {
  const [open, setOpen] = useState(false);

  const filteredOptions = options.filter(
    (option) => !currentItemId || option.id !== currentItemId
  );

  const selectedOption = value
    ? filteredOptions.find((opt) => opt.id === String(value) || Number(opt.id) === value)
    : null;

  const defaultRenderOption = (option: T) => {
    const indent = '  '.repeat(option.depth || 0);
    return `${indent}${option.name}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedOption
              ? renderOption
                ? renderOption(selectedOption)
                : selectedOption.name
              : placeholder}
          </span>
          <div className="flex items-center gap-1 ml-2">
            {allowClear && selectedOption && (
              <X
                className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {allowClear && (
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === null ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="text-muted-foreground italic">(No parent)</span>
                </CommandItem>
              )}
              {filteredOptions.map((option) => {
                const isSelected =
                  value === option.id || Number(value) === Number(option.id);

                return (
                  <CommandItem
                    key={option.id}
                    value={`${option.id}-${option.name}`}
                    onSelect={() => {
                      onChange(option.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        isSelected ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="truncate">
                      {renderOption ? renderOption(option) : defaultRenderOption(option)}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

