/**
 * TaskListItem - Single task row component (Linear-inspired design)
 * Dense, hover to reveal actions, inline completion
 * Supports drag-and-drop for state changes
 */

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, TaskState, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  MoreHorizontal,
  Calendar,
  Clock,
  ChevronRight,
  Trash2,
  Edit,
  ArrowRight,
  CheckCircle,
  Circle,
  GripVertical,
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

interface TaskListItemProps {
  task: Task;
  onClick?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  showPlan?: boolean;
  planName?: string;
  indent?: number;
}

// State badge colors (Linear-inspired)
const stateColors: Record<TaskState, { bg: string; text: string; border: string }> = {
  backlog: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  todo: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  in_progress: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  done: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' },
};

const stateLabels: Record<TaskState, string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  in_progress: 'In Progress',
  done: 'Done',
  cancelled: 'Cancelled',
};

export function TaskListItem({
  task,
  onClick,
  onEdit,
  showPlan = false,
  planName,
  indent = 0,
}: TaskListItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  // Drag and drop setup
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    paddingLeft: `${16 + indent * 24}px`,
  };

  const isCompleted = task.state === 'done' || task.state === 'cancelled';
  const isOverdue = task.targetDate && isPast(new Date(task.targetDate)) && !isCompleted;
  const isDueToday = task.targetDate && isToday(new Date(task.targetDate));

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTask.mutate(task.id);
    }
  };

  const stateColor = stateColors[task.state];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-3 px-4 py-2 border-b border-border/50 hover:bg-accent/50 transition-colors cursor-pointer',
        isCompleted && 'opacity-60',
        isDragging && 'opacity-50 bg-accent shadow-lg z-50'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick?.(task)}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-opacity',
          isHovered ? 'opacity-100' : 'opacity-0'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </div>
      {/* Subtask indicator */}
      {(task.childCount ?? 0) > 0 && (
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      )}

      {/* Task title */}
      <span
        className={cn(
          'flex-1 text-sm truncate',
          isCompleted && 'line-through text-muted-foreground'
        )}
      >
        {task.title}
      </span>

      {/* Plan name */}
      {planName && (
        <span className="shrink-0 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
          {planName}
        </span>
      )}

      {/* State badge */}
      <Badge
        variant="outline"
        className={cn(
          'shrink-0 text-xs font-medium',
          stateColor.bg,
          stateColor.text,
          stateColor.border
        )}
      >
        {stateLabels[task.state]}
      </Badge>

      {/* Estimate */}
      {task.estimateDisplay && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Clock className="h-3 w-3" />
          {task.estimateDisplay}
        </div>
      )}

      {/* Target date */}
      {task.targetDate && (
        <div
          className={cn(
            'flex items-center gap-1 text-xs shrink-0',
            isOverdue ? 'text-red-600 font-medium' : isDueToday ? 'text-amber-600' : 'text-muted-foreground'
          )}
        >
          <Calendar className="h-3 w-3" />
          {format(new Date(task.targetDate), 'MMM d')}
        </div>
      )}

      {/* Blocked indicator */}
      {task.isBlocked && (
        <Badge variant="destructive" className="shrink-0 text-xs">
          Blocked
        </Badge>
      )}

      {/* Actions dropdown (visible on hover) */}
      <div className={cn('shrink-0', isHovered ? 'opacity-100' : 'opacity-0')}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!isCompleted ? (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  updateTask.mutate({ id: task.id, updates: { state: 'done' } });
                }}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Done
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  updateTask.mutate({ id: task.id, updates: { state: 'todo' } });
                }}
              >
                <Circle className="h-4 w-4 mr-2" />
                Reopen
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onEdit?.(task)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Details
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ArrowRight className="h-4 w-4 mr-2" />
              Move to Plan
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default TaskListItem;
