import * as React from 'react';
import { cn } from '@/lib/utils';
import { Tag } from '@/lib/api';
import { X } from 'lucide-react';

interface TagBadgeProps {
  tag: Tag;
  onRemove?: () => void;
  className?: string;
  size?: 'sm' | 'default';
}

/**
 * Convert a hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Determine if text should be dark or light based on background color
 */
function getContrastColor(hexColor: string): string {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return '#000000';

  // Calculate relative luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

export function TagBadge({ tag, onRemove, className, size = 'default' }: TagBadgeProps) {
  const color = tag.attributes.color || '#6B7280';
  const textColor = getContrastColor(color);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium transition-colors',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
        onRemove && 'pr-1',
        className
      )}
      style={{
        backgroundColor: color,
        color: textColor,
      }}
    >
      {tag.attributes.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={cn(
            'rounded-full p-0.5 hover:bg-black/10 transition-colors',
            size === 'sm' ? 'ml-0.5' : 'ml-1'
          )}
          style={{ color: textColor }}
        >
          <X className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
        </button>
      )}
    </span>
  );
}

interface TagListProps {
  tags: Tag[];
  onRemove?: (tagId: string) => void;
  className?: string;
  size?: 'sm' | 'default';
  maxVisible?: number;
}

export function TagList({ tags, onRemove, className, size = 'default', maxVisible }: TagListProps) {
  const visibleTags = maxVisible ? tags.slice(0, maxVisible) : tags;
  const hiddenCount = maxVisible ? Math.max(0, tags.length - maxVisible) : 0;

  if (tags.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {visibleTags.map((tag) => (
        <TagBadge
          key={tag.id}
          tag={tag}
          size={size}
          onRemove={onRemove ? () => onRemove(tag.id) : undefined}
        />
      ))}
      {hiddenCount > 0 && (
        <span className={cn(
          'text-muted-foreground',
          size === 'sm' ? 'text-[10px]' : 'text-xs'
        )}>
          +{hiddenCount} more
        </span>
      )}
    </div>
  );
}
