/**
 * TaskList - Task list container with grouping by state
 * Linear-inspired collapsible sections
 */

import { useState } from 'react';
import { Task, TaskState } from '@/hooks/useTasks';
import { Plan } from '@/hooks/usePlans';
import { TaskListItem } from './TaskListItem';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  plans?: Plan[];
  groupBy?: 'state' | 'none';
  onTaskClick?: (task: Task) => void;
  onTaskEdit?: (task: Task) => void;
  onAddTask?: (state?: TaskState) => void;
  emptyMessage?: string;
}

// State order and colors for grouping
const stateOrder: TaskState[] = ['in_progress', 'todo', 'backlog', 'done', 'cancelled'];

const stateLabels: Record<TaskState, string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  in_progress: 'In Progress',
  done: 'Done',
  cancelled: 'Cancelled',
};

const stateColors: Record<TaskState, string> = {
  backlog: 'text-slate-600',
  todo: 'text-amber-600',
  in_progress: 'text-purple-600',
  done: 'text-green-600',
  cancelled: 'text-gray-500',
};

interface TaskGroupProps {
  state: TaskState;
  tasks: Task[];
  plansMap?: Map<number, string>;
  onTaskClick?: (task: Task) => void;
  onTaskEdit?: (task: Task) => void;
  onAddTask?: (state: TaskState) => void;
  defaultExpanded?: boolean;
}

function TaskGroup({
  state,
  tasks,
  plansMap,
  onTaskClick,
  onTaskEdit,
  onAddTask,
  defaultExpanded = true,
}: TaskGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border-b border-border last:border-b-0">
      {/* Group header */}
      <div
        className="flex items-center gap-2 px-4 py-2 bg-muted/30 hover:bg-muted/50 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <span className={cn('font-medium text-sm', stateColors[state])}>
          {stateLabels[state]}
        </span>
        <span className="text-xs text-muted-foreground">({tasks.length})</span>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onAddTask?.(state);
          }}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Tasks */}
      {isExpanded && (
        <div>
          {tasks.map((task) => (
            <TaskListItem
              key={task.id}
              task={task}
              planName={plansMap?.get(task.planId)}
              onClick={onTaskClick}
              onEdit={onTaskEdit}
            />
          ))}
          {tasks.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No tasks
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TaskList({
  tasks,
  plans,
  groupBy = 'state',
  onTaskClick,
  onTaskEdit,
  onAddTask,
  emptyMessage = 'No tasks found',
}: TaskListProps) {
  // Create a map of plan IDs to names for quick lookup
  const plansMap = new Map<number, string>(
    plans?.map((p) => [parseInt(p.id, 10), p.name]) || []
  );

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground mb-4">{emptyMessage}</p>
        {onAddTask && (
          <Button onClick={() => onAddTask()} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Button>
        )}
      </div>
    );
  }

  if (groupBy === 'none') {
    return (
      <div className="border rounded-lg divide-y">
        {tasks.map((task) => (
          <TaskListItem
            key={task.id}
            task={task}
            planName={plansMap.get(task.planId)}
            onClick={onTaskClick}
            onEdit={onTaskEdit}
          />
        ))}
      </div>
    );
  }

  // Group tasks by state
  const groupedTasks = stateOrder.reduce(
    (acc, state) => {
      acc[state] = tasks.filter((t) => t.state === state);
      return acc;
    },
    {} as Record<TaskState, Task[]>
  );

  // Only show groups that have tasks or are active states
  const activeStates: TaskState[] = ['in_progress', 'todo', 'backlog'];

  return (
    <div className="border rounded-lg overflow-hidden">
      {stateOrder.map((state) => {
        const stateTasks = groupedTasks[state];
        // Always show active states, only show done/cancelled if they have tasks
        if (stateTasks.length === 0 && !activeStates.includes(state)) {
          return null;
        }
        return (
          <TaskGroup
            key={state}
            state={state}
            tasks={stateTasks}
            plansMap={plansMap}
            onTaskClick={onTaskClick}
            onTaskEdit={onTaskEdit}
            onAddTask={onAddTask}
            defaultExpanded={activeStates.includes(state)}
          />
        );
      })}
    </div>
  );
}

export default TaskList;
