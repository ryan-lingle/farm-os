import * as React from 'react';
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tag } from '@/lib/api';
import { useTags, useCreateTag } from '@/hooks/useTags';
import { TagBadge } from './TagBadge';

interface TagSelectorProps {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function TagSelector({
  selectedTagIds,
  onTagsChange,
  className,
  placeholder = 'Select tags...',
  disabled = false,
}: TagSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');
  const { data: tags, isLoading } = useTags();
  const createTag = useCreateTag();

  const selectedTags = React.useMemo(() => {
    if (!tags) return [];
    return tags.filter((tag) => selectedTagIds.includes(tag.id));
  }, [tags, selectedTagIds]);

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  const handleCreateTag = async () => {
    if (!searchValue.trim()) return;

    try {
      const newTag = await createTag.mutateAsync({
        name: searchValue.trim(),
      });
      onTagsChange([...selectedTagIds, newTag.id]);
      setSearchValue('');
    } catch {
      // Error is handled by the mutation
    }
  };

  const showCreateOption =
    searchValue.trim() &&
    tags &&
    !tags.some(
      (tag) => tag.attributes.name.toLowerCase() === searchValue.toLowerCase()
    );

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
          <div className="flex flex-wrap gap-1 items-center">
            {selectedTags.length > 0 ? (
              selectedTags.map((tag) => (
                <TagBadge
                  key={tag.id}
                  tag={tag}
                  size="sm"
                  onRemove={() => toggleTag(tag.id)}
                />
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or create tags..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {isLoading ? (
              <CommandEmpty>Loading tags...</CommandEmpty>
            ) : (
              <>
                {tags && tags.length === 0 && !showCreateOption && (
                  <CommandEmpty>No tags found. Type to create one.</CommandEmpty>
                )}
                {showCreateOption && (
                  <>
                    <CommandGroup>
                      <CommandItem
                        onSelect={handleCreateTag}
                        className="cursor-pointer"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create "{searchValue}"
                      </CommandItem>
                    </CommandGroup>
                    {tags && tags.length > 0 && <CommandSeparator />}
                  </>
                )}
                {tags && tags.length > 0 && (
                  <CommandGroup heading="Tags">
                    {tags
                      .filter(
                        (tag) =>
                          !searchValue ||
                          tag.attributes.name
                            .toLowerCase()
                            .includes(searchValue.toLowerCase())
                      )
                      .map((tag) => (
                        <CommandItem
                          key={tag.id}
                          onSelect={() => toggleTag(tag.id)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: tag.attributes.color }}
                            />
                            <span>{tag.attributes.name}</span>
                          </div>
                          <Check
                            className={cn(
                              'h-4 w-4',
                              selectedTagIds.includes(tag.id)
                                ? 'opacity-100'
                                : 'opacity-0'
                            )}
                          />
                        </CommandItem>
                      ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface TagInputProps {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
  className?: string;
}

/**
 * Compact tag input that shows tags inline with an add button
 */
export function TagInput({ selectedTagIds, onTagsChange, className }: TagInputProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');
  const { data: tags, isLoading } = useTags();
  const createTag = useCreateTag();

  const selectedTags = React.useMemo(() => {
    if (!tags) return [];
    return tags.filter((tag) => selectedTagIds.includes(tag.id));
  }, [tags, selectedTagIds]);

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
    setSearchValue('');
  };

  const handleCreateTag = async () => {
    if (!searchValue.trim()) return;

    try {
      const newTag = await createTag.mutateAsync({
        name: searchValue.trim(),
      });
      onTagsChange([...selectedTagIds, newTag.id]);
      setSearchValue('');
    } catch {
      // Error handled by mutation
    }
  };

  const showCreateOption =
    searchValue.trim() &&
    tags &&
    !tags.some(
      (tag) => tag.attributes.name.toLowerCase() === searchValue.toLowerCase()
    );

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {selectedTags.map((tag) => (
        <TagBadge
          key={tag.id}
          tag={tag}
          size="sm"
          onRemove={() => toggleTag(tag.id)}
        />
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search or create..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              {isLoading ? (
                <CommandEmpty>Loading...</CommandEmpty>
              ) : (
                <>
                  {showCreateOption && (
                    <CommandGroup>
                      <CommandItem
                        onSelect={handleCreateTag}
                        className="cursor-pointer"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create "{searchValue}"
                      </CommandItem>
                    </CommandGroup>
                  )}
                  {tags && (
                    <CommandGroup>
                      {tags
                        .filter(
                          (tag) =>
                            !selectedTagIds.includes(tag.id) &&
                            (!searchValue ||
                              tag.attributes.name
                                .toLowerCase()
                                .includes(searchValue.toLowerCase()))
                        )
                        .map((tag) => (
                          <CommandItem
                            key={tag.id}
                            onSelect={() => toggleTag(tag.id)}
                            className="cursor-pointer"
                          >
                            <div
                              className="h-3 w-3 rounded-full mr-2"
                              style={{ backgroundColor: tag.attributes.color }}
                            />
                            {tag.attributes.name}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
