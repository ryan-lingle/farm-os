/**
 * MentionNode - React component for rendering entity mention chips
 *
 * Displays an icon + text chip with colors based on entity type
 */

import { useNavigate } from 'react-router-dom';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { getEntityIcon, getEntityColors } from '@/lib/entityIcons';
import { cn } from '@/lib/utils';

/**
 * Get the URL for an entity based on its type
 */
function getEntityUrl(type: string, id: string, assetType?: string, logType?: string): string {
  switch (type) {
    case 'asset':
      return `/records/assets/${assetType || 'animal'}/${id}`;
    case 'location':
      return `/records/locations/${id}`;
    case 'task':
      return `/tasks/${id}`;
    case 'plan':
      return `/tasks/plans/${id}`;
    case 'log':
      return `/records/logs/${logType || 'activity'}/${id}`;
    default:
      return '#';
  }
}

export function MentionNodeView({ node }: NodeViewProps) {
  const navigate = useNavigate();
  const { type, id, label, assetType, logType } = node.attrs;

  // Get the appropriate icon and colors
  const Icon = getEntityIcon(type, assetType);
  const colors = getEntityColors(type, assetType);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = getEntityUrl(type, id, assetType, logType);
    navigate(url);
  };

  return (
    <NodeViewWrapper
      as="span"
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-sm font-medium',
        'cursor-pointer hover:opacity-80 transition-opacity',
        colors.bg,
        colors.text,
        colors.border,
        'border'
      )}
      data-mention-type={type}
      data-mention-id={id}
      data-mention-label={label}
      data-asset-type={assetType}
      onClick={handleClick}
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="truncate max-w-[200px]">{label}</span>
    </NodeViewWrapper>
  );
}

/**
 * Static mention chip component for rendering mentions outside of TipTap
 * (e.g., in back-reference lists, search results)
 */
interface MentionChipProps {
  type: string;
  id: string | number;
  label: string;
  assetType?: string;
  onClick?: () => void;
  className?: string;
}

export function MentionChip({
  type,
  id,
  label,
  assetType,
  onClick,
  className,
}: MentionChipProps) {
  const Icon = getEntityIcon(type, assetType);
  const colors = getEntityColors(type, assetType);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-sm font-medium',
        'cursor-pointer hover:opacity-80 transition-opacity',
        colors.bg,
        colors.text,
        colors.border,
        'border',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="truncate max-w-[200px]">{label}</span>
    </span>
  );
}

export default MentionNodeView;
