/**
 * BackReferences - Displays entities that reference this item
 *
 * Shows a list of tasks and plans that mention this asset, location, task, or plan.
 * Used on detail pages to show bidirectional links.
 */

import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { entityIcons, entityColors } from '@/lib/entityIcons';
import { CheckSquare, FolderKanban, FileText, ChevronRight } from 'lucide-react';

interface BackReferenceItem {
  id: number;
  name: string;
  type: 'task' | 'plan' | 'log';
  status?: string;
  state?: string;
}

interface BackReferencesProps {
  /** Entity type being referenced */
  entityType: 'asset' | 'location' | 'task' | 'plan' | 'log';
  /** Number of referencing tasks (from API) */
  referencingTaskCount?: number;
  /** Number of referencing plans (from API) */
  referencingPlanCount?: number;
  /** Actual task references if loaded */
  referencingTasks?: BackReferenceItem[];
  /** Actual plan references if loaded */
  referencingPlans?: BackReferenceItem[];
  /** Show compact view (just counts) */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function BackReferences({
  entityType,
  referencingTaskCount = 0,
  referencingPlanCount = 0,
  referencingTasks = [],
  referencingPlans = [],
  compact = false,
  className,
}: BackReferencesProps) {
  const totalCount = referencingTaskCount + referencingPlanCount;

  if (totalCount === 0) {
    return null;
  }

  // Compact mode: just show badges with counts
  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {referencingTaskCount > 0 && (
          <div
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
              entityColors.task.bg,
              entityColors.task.text
            )}
            title={`Referenced by ${referencingTaskCount} task${referencingTaskCount !== 1 ? 's' : ''}`}
          >
            <CheckSquare className="h-3 w-3" />
            {referencingTaskCount}
          </div>
        )}
        {referencingPlanCount > 0 && (
          <div
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
              entityColors.plan.bg,
              entityColors.plan.text
            )}
            title={`Referenced by ${referencingPlanCount} plan${referencingPlanCount !== 1 ? 's' : ''}`}
          >
            <FolderKanban className="h-3 w-3" />
            {referencingPlanCount}
          </div>
        )}
      </div>
    );
  }

  // Full mode: show list of references
  return (
    <div className={cn('space-y-3', className)}>
      <h4 className="text-sm font-medium text-muted-foreground">Referenced by</h4>

      {/* Task references */}
      {referencingTasks.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <CheckSquare className="h-3 w-3" />
            Tasks ({referencingTasks.length})
          </div>
          <div className="space-y-1">
            {referencingTasks.map((task) => (
              <BackReferenceLink
                key={`task-${task.id}`}
                item={task}
                type="task"
              />
            ))}
          </div>
        </div>
      )}

      {/* Plan references */}
      {referencingPlans.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <FolderKanban className="h-3 w-3" />
            Plans ({referencingPlans.length})
          </div>
          <div className="space-y-1">
            {referencingPlans.map((plan) => (
              <BackReferenceLink
                key={`plan-${plan.id}`}
                item={plan}
                type="plan"
              />
            ))}
          </div>
        </div>
      )}

      {/* Show counts if we don't have the full lists loaded */}
      {referencingTasks.length === 0 && referencingTaskCount > 0 && (
        <div className="text-sm text-muted-foreground">
          Referenced by {referencingTaskCount} task{referencingTaskCount !== 1 ? 's' : ''}
        </div>
      )}
      {referencingPlans.length === 0 && referencingPlanCount > 0 && (
        <div className="text-sm text-muted-foreground">
          Referenced by {referencingPlanCount} plan{referencingPlanCount !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

interface BackReferenceLinkProps {
  item: BackReferenceItem;
  type: 'task' | 'plan';
}

function BackReferenceLink({ item, type }: BackReferenceLinkProps) {
  const Icon = entityIcons[type];
  const colors = entityColors[type];

  const href = type === 'task' ? `/tasks/${item.id}` : `/tasks/plans/${item.id}`;

  return (
    <Link
      to={href}
      className={cn(
        'flex items-center gap-2 p-2 rounded-md',
        'hover:bg-accent transition-colors',
        'group'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center h-6 w-6 rounded flex-shrink-0',
          colors.bg,
          colors.text
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="flex-1 text-sm truncate">{item.name}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

/**
 * Compact inline badge showing reference counts
 */
interface ReferenceCountBadgesProps {
  referencingTaskCount?: number;
  referencingPlanCount?: number;
  className?: string;
}

export function ReferenceCountBadges({
  referencingTaskCount = 0,
  referencingPlanCount = 0,
  className,
}: ReferenceCountBadgesProps) {
  if (referencingTaskCount === 0 && referencingPlanCount === 0) {
    return null;
  }

  return (
    <BackReferences
      entityType="asset"
      referencingTaskCount={referencingTaskCount}
      referencingPlanCount={referencingPlanCount}
      compact
      className={className}
    />
  );
}

export default BackReferences;
