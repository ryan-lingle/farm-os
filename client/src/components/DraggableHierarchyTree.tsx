import React, { useState } from 'react';
import { ChevronRight, ChevronDown, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TreeNode } from './HierarchyTreeView';

interface DraggableTreeViewProps<T extends TreeNode> {
  nodes: T[];
  selectedId?: string;
  onSelect?: (node: T) => void;
  onMove: (nodeId: string, newParentId: string | null) => Promise<void>;
  renderIcon?: (node: T, isExpanded: boolean) => React.ReactNode;
  renderLabel?: (node: T) => React.ReactNode;
  renderActions?: (node: T) => React.ReactNode;
  className?: string;
  indentSize?: number;
}

export function DraggableHierarchyTree<T extends TreeNode>({
  nodes,
  selectedId,
  onSelect,
  onMove,
  renderIcon,
  renderLabel,
  renderActions,
  className,
  indentSize = 20,
}: DraggableTreeViewProps<T>) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [draggedNode, setDraggedNode] = useState<T | null>(null);
  const [dragOverNode, setDragOverNode] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);

  const handleToggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedIds(newExpanded);
  };

  // Build tree structure from flat list
  const buildTree = (parentId: number | null = null): T[] => {
    return nodes
      .filter(node => node.parent_id === parentId || (!parentId && !node.parent_id))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const canDrop = (sourceNode: T, targetNode: T, position: 'inside' | 'before' | 'after'): boolean => {
    // Can't drop on self
    if (sourceNode.id === targetNode.id) return false;
    
    // Can't drop parent on its own descendant
    // (In a full implementation, you'd need to check all descendants)
    if (targetNode.parent_id && targetNode.parent_id === Number(sourceNode.id)) return false;
    
    return true;
  };

  const handleDragStart = (e: React.DragEvent, node: T) => {
    setDraggedNode(node);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', node.id);
  };

  const handleDragOver = (e: React.DragEvent, node: T) => {
    e.preventDefault();
    if (!draggedNode) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    // Determine drop position based on cursor position
    let position: 'before' | 'after' | 'inside';
    if (y < height * 0.25) {
      position = 'before';
    } else if (y > height * 0.75) {
      position = 'after';
    } else {
      position = 'inside';
    }
    
    if (canDrop(draggedNode, node, position)) {
      setDragOverNode(node.id);
      setDropPosition(position);
      e.dataTransfer.dropEffect = 'move';
    } else {
      setDragOverNode(null);
      setDropPosition(null);
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleDragLeave = () => {
    setDragOverNode(null);
    setDropPosition(null);
  };

  const handleDrop = async (e: React.DragEvent, targetNode: T) => {
    e.preventDefault();
    if (!draggedNode || !dropPosition) return;
    
    if (!canDrop(draggedNode, targetNode, dropPosition)) {
      setDraggedNode(null);
      setDragOverNode(null);
      setDropPosition(null);
      return;
    }
    
    try {
      let newParentId: string | null = null;
      
      if (dropPosition === 'inside') {
        // Drop inside: make target the new parent
        newParentId = targetNode.id;
        // Expand the target to show the moved node
        setExpandedIds(prev => new Set(prev).add(targetNode.id));
      } else {
        // Drop before/after: use same parent as target
        newParentId = targetNode.parent_id ? String(targetNode.parent_id) : null;
      }
      
      await onMove(draggedNode.id, newParentId);
    } catch (error) {
      console.error('Failed to move node:', error);
    } finally {
      setDraggedNode(null);
      setDragOverNode(null);
      setDropPosition(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedNode(null);
    setDragOverNode(null);
    setDropPosition(null);
  };

  const renderNode = (node: T, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedIds.has(node.id);
    const isSelected = selectedId === node.id;
    const hasChildren = node.child_count && node.child_count > 0;
    const indent = depth * indentSize;
    const children = buildTree(Number(node.id));
    
    const isDragging = draggedNode?.id === node.id;
    const isDragOver = dragOverNode === node.id;
    
    return (
      <div key={node.id}>
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, node)}
          onDragOver={(e) => handleDragOver(e, node)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node)}
          onDragEnd={handleDragEnd}
          className={cn(
            'group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-move transition-colors relative',
            'hover:bg-accent hover:text-accent-foreground',
            isSelected && 'bg-accent text-accent-foreground font-medium',
            isDragging && 'opacity-50',
            isDragOver && dropPosition === 'before' && 'border-t-2 border-primary',
            isDragOver && dropPosition === 'after' && 'border-b-2 border-primary',
            isDragOver && dropPosition === 'inside' && 'ring-2 ring-primary ring-inset'
          )}
          style={{ paddingLeft: `${indent + 8}px` }}
        >
          {/* Drag handle */}
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-50 transition-opacity">
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Expand/collapse button */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleExpand(node.id);
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
            <div className="w-5" />
          )}

          {/* Icon */}
          <div className="flex-shrink-0">
            {renderIcon ? renderIcon(node, isExpanded) : null}
          </div>

          {/* Label */}
          <div 
            className="flex-1 truncate text-sm"
            onClick={() => onSelect?.(node)}
          >
            {renderLabel ? renderLabel(node) : node.name}
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

        {/* Render children */}
        {isExpanded && children.length > 0 && (
          <div>
            {children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootNodes = buildTree(null);

  return (
    <div className={cn('space-y-0.5', className)}>
      {rootNodes.map((node) => renderNode(node, 0))}
      
      {/* Drop zone for root level */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (draggedNode) {
            setDragOverNode('root');
            setDropPosition('inside');
            e.dataTransfer.dropEffect = 'move';
          }
        }}
        onDragLeave={() => {
          setDragOverNode(null);
          setDropPosition(null);
        }}
        onDrop={async (e) => {
          e.preventDefault();
          if (draggedNode) {
            try {
              await onMove(draggedNode.id, null);
            } catch (error) {
              console.error('Failed to move to root:', error);
            } finally {
              setDraggedNode(null);
              setDragOverNode(null);
              setDropPosition(null);
            }
          }
        }}
        className={cn(
          'p-4 mt-2 border-2 border-dashed rounded-lg text-center text-xs text-muted-foreground transition-colors',
          dragOverNode === 'root' ? 'border-primary bg-primary/5' : 'border-transparent'
        )}
      >
        {draggedNode && dragOverNode === 'root' && 'Drop here to make root item'}
      </div>
    </div>
  );
}

