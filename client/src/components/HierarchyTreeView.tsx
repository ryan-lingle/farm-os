import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TreeNode {
  id: string;
  name: string;
  parent_id?: number | null;
  child_count?: number;
  is_leaf?: boolean;
  depth?: number;
  [key: string]: any; // Allow additional properties
}

interface TreeViewProps<T extends TreeNode> {
  nodes: T[];
  selectedId?: string;
  onSelect?: (node: T) => void;
  onExpand?: (node: T) => void;
  expandedIds?: Set<string>;
  renderIcon?: (node: T, isExpanded: boolean) => React.ReactNode;
  renderLabel?: (node: T) => React.ReactNode;
  renderActions?: (node: T) => React.ReactNode;
  className?: string;
  indentSize?: number;
}

export function HierarchyTreeView<T extends TreeNode>({
  nodes,
  selectedId,
  onSelect,
  onExpand,
  expandedIds = new Set(),
  renderIcon,
  renderLabel,
  renderActions,
  className,
  indentSize = 20,
}: TreeViewProps<T>) {
  const [localExpandedIds, setLocalExpandedIds] = useState<Set<string>>(new Set());
  
  // Use controlled or uncontrolled expansion state
  const currentExpandedIds = expandedIds.size > 0 ? expandedIds : localExpandedIds;
  
  const handleToggleExpand = (node: T) => {
    if (expandedIds.size === 0) {
      // Uncontrolled mode
      const newExpanded = new Set(localExpandedIds);
      if (newExpanded.has(node.id)) {
        newExpanded.delete(node.id);
      } else {
        newExpanded.add(node.id);
      }
      setLocalExpandedIds(newExpanded);
    }
    
    // Always call onExpand if provided
    onExpand?.(node);
  };

  const defaultRenderIcon = (node: T, isExpanded: boolean) => {
    if (node.is_leaf || !node.child_count) {
      return <MapPin className="h-4 w-4 text-muted-foreground" />;
    }
    return isExpanded ? (
      <FolderOpen className="h-4 w-4 text-muted-foreground" />
    ) : (
      <Folder className="h-4 w-4 text-muted-foreground" />
    );
  };

  const defaultRenderLabel = (node: T) => node.name;

  return (
    <div className={cn('space-y-0.5', className)}>
      {nodes.map((node) => {
        const isExpanded = currentExpandedIds.has(node.id);
        const isSelected = selectedId === node.id;
        const hasChildren = node.child_count && node.child_count > 0;
        const indent = (node.depth || 0) * indentSize;

        return (
          <div key={node.id}>
            <div
              className={cn(
                'group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                isSelected && 'bg-accent text-accent-foreground font-medium'
              )}
              style={{ paddingLeft: `${indent + 8}px` }}
              onClick={() => onSelect?.(node)}
            >
              {/* Expand/collapse button */}
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleExpand(node);
                  }}
                  className="p-0.5 hover:bg-accent-foreground/10 rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <div className="w-5" /> // Spacer for alignment
              )}

              {/* Icon */}
              <div className="flex-shrink-0">
                {renderIcon ? renderIcon(node, isExpanded) : defaultRenderIcon(node, isExpanded)}
              </div>

              {/* Label */}
              <div className="flex-1 truncate text-sm">
                {renderLabel ? renderLabel(node) : defaultRenderLabel(node)}
              </div>

              {/* Child count badge */}
              {hasChildren && (
                <div className="flex-shrink-0 text-xs text-muted-foreground">
                  {node.child_count}
                </div>
              )}

              {/* Actions */}
              {renderActions && (
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {renderActions(node)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Alternative tree view with lazy-loading children
interface LazyTreeViewProps<T extends TreeNode> {
  rootNodes: T[];
  selectedId?: string;
  onSelect?: (node: T) => void;
  onLoadChildren: (nodeId: string) => Promise<T[]>;
  renderIcon?: (node: T, isExpanded: boolean) => React.ReactNode;
  renderLabel?: (node: T) => React.ReactNode;
  renderActions?: (node: T) => React.ReactNode;
  className?: string;
  indentSize?: number;
}

export function LazyHierarchyTreeView<T extends TreeNode>({
  rootNodes,
  selectedId,
  onSelect,
  onLoadChildren,
  renderIcon,
  renderLabel,
  renderActions,
  className,
  indentSize = 16,
}: LazyTreeViewProps<T>) {
  const [expandedNodes, setExpandedNodes] = useState<Map<string, T[]>>(new Map());
  const [loading, setLoading] = useState<Set<string>>(new Set());
  
  const handleExpand = async (node: T) => {
    if (expandedNodes.has(node.id)) {
      // Collapse
      const newExpanded = new Map(expandedNodes);
      newExpanded.delete(node.id);
      setExpandedNodes(newExpanded);
    } else {
      // Expand - load children if needed
      setLoading((prev) => new Set(prev).add(node.id));
      try {
        const children = await onLoadChildren(node.id);
        const newExpanded = new Map(expandedNodes);
        newExpanded.set(node.id, children);
        setExpandedNodes(newExpanded);
      } catch (error) {
        console.error('Failed to load children:', error);
      } finally {
        setLoading((prev) => {
          const newLoading = new Set(prev);
          newLoading.delete(node.id);
          return newLoading;
        });
      }
    }
  };

  const renderNode = (node: T, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedId === node.id;
    const hasChildren = node.child_count && node.child_count > 0;
    const isLoading = loading.has(node.id);
    const indent = depth * indentSize;
    const children = expandedNodes.get(node.id) || [];

    const defaultRenderIcon = (n: T, expanded: boolean) => {
      if (n.is_leaf || !n.child_count) {
        return <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
      }
      return expanded ? (
        <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      ) : (
        <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      );
    };

    const defaultRenderLabel = (n: T) => n.name;

    return (
      <div key={node.id}>
        <div
          className={cn(
            'group flex items-center gap-1.5 px-2 py-2 rounded-md cursor-pointer transition-colors min-h-[40px]',
            'hover:bg-accent hover:text-accent-foreground',
            isSelected && 'bg-accent text-accent-foreground font-medium'
          )}
          style={{ paddingLeft: `${indent + 8}px` }}
          onClick={() => onSelect?.(node)}
        >
          {/* Expand/collapse button */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleExpand(node);
              }}
              className="p-0.5 hover:bg-accent-foreground/10 rounded flex-shrink-0"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="w-5 flex-shrink-0" />
          )}

          {/* Icon */}
          <div className="flex-shrink-0">
            {renderIcon ? renderIcon(node, isExpanded) : defaultRenderIcon(node, isExpanded)}
          </div>

          {/* Label - with improved layout */}
          <div className="flex-1 min-w-0 text-sm">
            {renderLabel ? renderLabel(node) : defaultRenderLabel(node)}
          </div>

          {/* Actions - show on hover */}
          {renderActions && (
            <div className="flex-shrink-0 hidden group-hover:flex items-center gap-0.5">
              {renderActions(node)}
            </div>
          )}
        </div>

        {/* Render children */}
        {isExpanded && children.length > 0 && (
          <div>
            {children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('space-y-0.5', className)}>
      {rootNodes.map((node) => renderNode(node, 0))}
    </div>
  );
}

