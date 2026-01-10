import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export interface BreadcrumbNode {
  id: string;
  name: string;
  parent_id?: number | null;
  [key: string]: any;
}

interface HierarchyBreadcrumbProps<T extends BreadcrumbNode> {
  currentNode?: T;
  ancestors?: T[];
  onNavigate?: (node: T) => void;
  showRoot?: boolean;
  rootLabel?: string;
  onRootClick?: () => void;
  className?: string;
}

export function HierarchyBreadcrumb<T extends BreadcrumbNode>({
  currentNode,
  ancestors = [],
  onNavigate,
  showRoot = true,
  rootLabel = 'Root',
  onRootClick,
  className,
}: HierarchyBreadcrumbProps<T>) {
  // Build breadcrumb path: ancestors (oldest first) + current node
  const path = [...ancestors];
  
  if (!currentNode && path.length === 0) {
    return null;
  }

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {/* Root item */}
        {showRoot && (
          <>
            <BreadcrumbItem>
              {onRootClick ? (
                <BreadcrumbLink 
                  onClick={onRootClick}
                  className="flex items-center gap-1 cursor-pointer"
                >
                  <Home className="h-3.5 w-3.5" />
                  <span>{rootLabel}</span>
                </BreadcrumbLink>
              ) : (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Home className="h-3.5 w-3.5" />
                  <span>{rootLabel}</span>
                </span>
              )}
            </BreadcrumbItem>
            {(path.length > 0 || currentNode) && <BreadcrumbSeparator />}
          </>
        )}

        {/* Ancestor nodes */}
        {path.map((node, index) => (
          <React.Fragment key={node.id}>
            <BreadcrumbItem>
              {onNavigate ? (
                <BreadcrumbLink
                  onClick={() => onNavigate(node)}
                  className="cursor-pointer"
                >
                  {node.name}
                </BreadcrumbLink>
              ) : (
                <span className="text-muted-foreground">{node.name}</span>
              )}
            </BreadcrumbItem>
            {(index < path.length - 1 || currentNode) && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}

        {/* Current node */}
        {currentNode && (
          <BreadcrumbItem>
            <BreadcrumbPage>{currentNode.name}</BreadcrumbPage>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

// Compact breadcrumb with ellipsis for long paths
interface CompactHierarchyBreadcrumbProps<T extends BreadcrumbNode> {
  currentNode?: T;
  ancestors?: T[];
  onNavigate?: (node: T) => void;
  maxItems?: number; // Max items to show before collapsing
  showRoot?: boolean;
  rootLabel?: string;
  onRootClick?: () => void;
  className?: string;
}

export function CompactHierarchyBreadcrumb<T extends BreadcrumbNode>({
  currentNode,
  ancestors = [],
  onNavigate,
  maxItems = 3,
  showRoot = true,
  rootLabel = 'Root',
  onRootClick,
  className,
}: CompactHierarchyBreadcrumbProps<T>) {
  const path = [...ancestors];
  
  if (!currentNode && path.length === 0) {
    return null;
  }

  // Determine which items to show
  const rootCount = showRoot ? 1 : 0;
  const currentCount = currentNode ? 1 : 0;
  const availableSlots = maxItems - rootCount - currentCount;
  
  let visibleAncestors = path;
  let hasEllipsis = false;

  if (path.length > availableSlots && availableSlots > 0) {
    // Show first and last items with ellipsis in middle
    const itemsToShow = Math.max(1, availableSlots);
    const firstItems = Math.ceil(itemsToShow / 2);
    const lastItems = Math.floor(itemsToShow / 2);
    
    visibleAncestors = [
      ...path.slice(0, firstItems),
      ...path.slice(-lastItems),
    ];
    hasEllipsis = true;
  }

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {/* Root item */}
        {showRoot && (
          <>
            <BreadcrumbItem>
              {onRootClick ? (
                <BreadcrumbLink 
                  onClick={onRootClick}
                  className="flex items-center gap-1 cursor-pointer"
                >
                  <Home className="h-3.5 w-3.5" />
                  <span>{rootLabel}</span>
                </BreadcrumbLink>
              ) : (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Home className="h-3.5 w-3.5" />
                  <span>{rootLabel}</span>
                </span>
              )}
            </BreadcrumbItem>
            {(path.length > 0 || currentNode) && <BreadcrumbSeparator />}
          </>
        )}

        {/* Ellipsis if path is collapsed */}
        {hasEllipsis && path.length > availableSlots && (
          <>
            {visibleAncestors.slice(0, Math.ceil(availableSlots / 2)).map((node) => (
              <React.Fragment key={node.id}>
                <BreadcrumbItem>
                  {onNavigate ? (
                    <BreadcrumbLink
                      onClick={() => onNavigate(node)}
                      className="cursor-pointer"
                    >
                      {node.name}
                    </BreadcrumbLink>
                  ) : (
                    <span className="text-muted-foreground">{node.name}</span>
                  )}
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </React.Fragment>
            ))}
            <BreadcrumbItem>
              <span className="text-muted-foreground">...</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {visibleAncestors.slice(-Math.floor(availableSlots / 2)).map((node) => (
              <React.Fragment key={node.id}>
                <BreadcrumbItem>
                  {onNavigate ? (
                    <BreadcrumbLink
                      onClick={() => onNavigate(node)}
                      className="cursor-pointer"
                    >
                      {node.name}
                    </BreadcrumbLink>
                  ) : (
                    <span className="text-muted-foreground">{node.name}</span>
                  )}
                </BreadcrumbItem>
                {currentNode && <BreadcrumbSeparator />}
              </React.Fragment>
            ))}
          </>
        )}

        {/* All ancestors if no ellipsis */}
        {!hasEllipsis && visibleAncestors.map((node, index) => (
          <React.Fragment key={node.id}>
            <BreadcrumbItem>
              {onNavigate ? (
                <BreadcrumbLink
                  onClick={() => onNavigate(node)}
                  className="cursor-pointer"
                >
                  {node.name}
                </BreadcrumbLink>
              ) : (
                <span className="text-muted-foreground">{node.name}</span>
              )}
            </BreadcrumbItem>
            {(index < visibleAncestors.length - 1 || currentNode) && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}

        {/* Current node */}
        {currentNode && (
          <BreadcrumbItem>
            <BreadcrumbPage>{currentNode.name}</BreadcrumbPage>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

