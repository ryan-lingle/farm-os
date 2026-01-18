/**
 * TaskList - Task list container with Linear-style organization
 * - In Progress: Tasks being worked on
 * - Scheduled (by cycle): Tasks assigned to cycles, grouped by cycle
 * - Backlog: Unscheduled tasks (no cycle)
 * - Done/Cancelled: Completed tasks
 * Supports drag-and-drop between state groups
 */

import { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCenter,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task, TaskState, useUpdateTask } from '@/hooks/useTasks';
import { Plan } from '@/hooks/usePlans';
import { useCycles, Cycle } from '@/hooks/useCycles';
import { TaskListItem } from './TaskListItem';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Plus, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface TaskListProps {
  tasks: Task[];
  plans?: Plan[];
  groupBy?: 'state' | 'none';
  onTaskClick?: (task: Task) => void;
  onTaskEdit?: (task: Task) => void;
  onAddTask?: (state?: TaskState) => void;
  emptyMessage?: string;
}

// State labels and colors
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

interface DroppableGroupProps {
  id: string;
  title: string;
  titleColor?: string;
  icon?: React.ReactNode;
  tasks: Task[];
  allTasks?: Task[];
  plansMap?: Map<number, string>;
  onTaskClick?: (task: Task) => void;
  onTaskEdit?: (task: Task) => void;
  onAddTask?: () => void;
  defaultExpanded?: boolean;
  dropData: { type: string; state?: TaskState; cycleId?: number };
}

function DroppableGroup({
  id,
  title,
  titleColor = 'text-foreground',
  icon,
  tasks,
  allTasks,
  plansMap,
  onTaskClick,
  onTaskEdit,
  onAddTask,
  defaultExpanded = true,
  dropData,
}: DroppableGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Make this group a drop target
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: dropData,
  });

  return (
    <div className="border-b border-border last:border-b-0">
      {/* Group header */}
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2 bg-muted/30 hover:bg-muted/50 cursor-pointer select-none transition-colors',
          isOver && 'bg-primary/10 ring-2 ring-primary ring-inset'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        {icon}
        <span className={cn('font-medium text-sm', titleColor)}>
          {title}
        </span>
        <span className="text-xs text-muted-foreground">({tasks.length})</span>
        <div className="flex-1" />
        {onAddTask && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onAddTask();
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Tasks - droppable area */}
      <div
        ref={setNodeRef}
        className={cn(
          'transition-colors min-h-[2px]',
          isOver && 'bg-primary/5'
        )}
      >
        {isExpanded && (
          <SortableContext
            items={tasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.map((task) => (
              <TaskListItem
                key={task.id}
                task={task}
                planName={plansMap?.get(task.planId)}
                onClick={onTaskClick}
                onEdit={onTaskEdit}
                allTasks={allTasks}
              />
            ))}
            {tasks.length === 0 && (
              <div className="px-4 py-4 text-center text-sm text-muted-foreground">
                No tasks
              </div>
            )}
          </SortableContext>
        )}
      </div>
    </div>
  );
}

// Cycle group component with nested structure
interface CycleGroupProps {
  cycle: Cycle;
  tasks: Task[];
  allTasks?: Task[];
  plansMap?: Map<number, string>;
  onTaskClick?: (task: Task) => void;
  onTaskEdit?: (task: Task) => void;
  defaultExpanded?: boolean;
}

function CycleGroup({
  cycle,
  tasks,
  allTasks,
  plansMap,
  onTaskClick,
  onTaskEdit,
  defaultExpanded = true,
}: CycleGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Make this cycle a drop target
  const { setNodeRef, isOver } = useDroppable({
    id: `cycle-${cycle.id}`,
    data: {
      type: 'cycle',
      cycleId: parseInt(cycle.id, 10),
    },
  });

  // Display month name from startDate, fallback to cycle name
  const displayName = cycle.startDate
    ? format(new Date(cycle.startDate), 'MMMM yyyy')
    : cycle.name;

  return (
    <div className="ml-4">
      {/* Cycle header */}
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2 bg-muted/50 border-y border-border cursor-pointer select-none transition-colors',
          isOver && 'bg-primary/10'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <Calendar className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-semibold text-foreground">{displayName}</span>
        <span className="text-xs text-muted-foreground font-medium">({tasks.length})</span>
        {cycle.isCurrent && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
            Current
          </span>
        )}
      </div>

      {/* Tasks */}
      <div
        ref={setNodeRef}
        className={cn(
          'transition-colors min-h-[2px] pl-4 border-l-2 border-muted ml-2',
          isOver && 'bg-primary/5 border-l-primary'
        )}
      >
        {isExpanded && (
          <SortableContext
            items={tasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.map((task) => (
              <TaskListItem
                key={task.id}
                task={task}
                planName={plansMap?.get(task.planId)}
                onClick={onTaskClick}
                onEdit={onTaskEdit}
                allTasks={allTasks}
              />
            ))}
          </SortableContext>
        )}
      </div>
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
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const updateTask = useUpdateTask();
  const { cycles } = useCycles();

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Create a map of plan IDs to names for quick lookup
  const plansMap = new Map<number, string>(
    plans?.map((p) => [parseInt(p.id, 10), p.name]) || []
  );

  // Create a map of cycle IDs to cycles
  const cyclesMap = useMemo(() =>
    new Map<number, Cycle>(cycles.map((c) => [parseInt(c.id, 10), c])),
    [cycles]
  );

  // Organize tasks into groups (only root tasks - those without parents or whose parent isn't in this list)
  const organizedTasks = useMemo(() => {
    const inProgress: Task[] = [];
    const scheduledByCycle: Map<number, Task[]> = new Map();
    const backlog: Task[] = [];
    const done: Task[] = [];
    const cancelled: Task[] = [];

    // Create a set of task IDs for quick parent lookup
    const taskIdSet = new Set(tasks.map((t) => parseInt(t.id, 10)));

    for (const task of tasks) {
      // Skip tasks whose parent is in this list (they'll be rendered as children)
      if (task.parentId && taskIdSet.has(task.parentId)) {
        continue;
      }

      if (task.state === 'done') {
        done.push(task);
      } else if (task.state === 'cancelled') {
        cancelled.push(task);
      } else if (task.state === 'in_progress') {
        inProgress.push(task);
      } else if (task.cycleId) {
        // Task is scheduled (has a cycle) - group by cycle
        const cycleTasks = scheduledByCycle.get(task.cycleId) || [];
        cycleTasks.push(task);
        scheduledByCycle.set(task.cycleId, cycleTasks);
      } else {
        // Task is unscheduled (no cycle) - goes to backlog
        backlog.push(task);
      }
    }

    // Sort cycles by start date
    const sortedCycleIds = Array.from(scheduledByCycle.keys()).sort((a, b) => {
      const cycleA = cyclesMap.get(a);
      const cycleB = cyclesMap.get(b);
      if (!cycleA || !cycleB) return 0;
      return new Date(cycleA.startDate).getTime() - new Date(cycleB.startDate).getTime();
    });

    return {
      inProgress,
      scheduledByCycle,
      sortedCycleIds,
      backlog,
      done,
      cancelled,
    };
  }, [tasks, cyclesMap]);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    setActiveTask(task || null);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeTaskId = active.id as string;
    const overId = over.id as string;
    const task = tasks.find((t) => t.id === activeTaskId);

    if (!task) return;

    // Dropped on a state group
    if (overId.startsWith('state-')) {
      const newState = overId.replace('state-', '') as TaskState;

      if (newState === 'backlog') {
        // Moving to backlog removes cycle assignment
        if (task.state !== 'backlog' || task.cycleId) {
          updateTask.mutate({
            id: activeTaskId,
            updates: { state: 'backlog', cycleId: null },
          });
        }
      } else if (task.state !== newState) {
        updateTask.mutate({
          id: activeTaskId,
          updates: { state: newState },
        });
      }
    }
    // Dropped on a cycle group
    else if (overId.startsWith('cycle-')) {
      const newCycleId = parseInt(overId.replace('cycle-', ''), 10);

      if (task.cycleId !== newCycleId) {
        // Moving to a cycle sets state to 'todo' if currently in backlog
        const updates: { cycleId: number; state?: TaskState } = { cycleId: newCycleId };
        if (task.state === 'backlog') {
          updates.state = 'todo';
        }
        updateTask.mutate({
          id: activeTaskId,
          updates,
        });
      }
    }
  };

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

  const { inProgress, scheduledByCycle, sortedCycleIds, backlog, done, cancelled } = organizedTasks;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="border rounded-lg overflow-hidden">
        {/* In Progress */}
        {(inProgress.length > 0 || true) && (
          <DroppableGroup
            id="state-in_progress"
            title="In Progress"
            titleColor={stateColors.in_progress}
            tasks={inProgress}
            allTasks={tasks}
            plansMap={plansMap}
            onTaskClick={onTaskClick}
            onTaskEdit={onTaskEdit}
            defaultExpanded={true}
            dropData={{ type: 'state', state: 'in_progress' }}
          />
        )}

        {/* Scheduled (by cycle) */}
        {sortedCycleIds.length > 0 && (
          <div className="border-b border-border last:border-b-0">
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/30">
              <Calendar className="h-4 w-4 text-amber-600" />
              <span className={cn('font-medium text-sm', stateColors.todo)}>
                Scheduled
              </span>
              <span className="text-xs text-muted-foreground">
                ({sortedCycleIds.reduce((sum, id) => sum + (scheduledByCycle.get(id)?.length || 0), 0)})
              </span>
            </div>
            {sortedCycleIds.map((cycleId) => {
              const cycle = cyclesMap.get(cycleId);
              const cycleTasks = scheduledByCycle.get(cycleId) || [];
              // Create a fallback cycle if not found in cyclesMap
              const displayCycle = cycle || {
                id: String(cycleId),
                name: `Cycle ${cycleId}`,
                startDate: '',
                endDate: '',
                isCurrent: false,
                isFuture: false,
              } as Cycle;
              return (
                <CycleGroup
                  key={cycleId}
                  cycle={displayCycle}
                  tasks={cycleTasks}
                  allTasks={tasks}
                  plansMap={plansMap}
                  onTaskClick={onTaskClick}
                  onTaskEdit={onTaskEdit}
                  defaultExpanded={displayCycle.isCurrent || displayCycle.isFuture || !cycle}
                />
              );
            })}
          </div>
        )}

        {/* Backlog (unscheduled) */}
        <DroppableGroup
          id="state-backlog"
          title="Backlog"
          titleColor={stateColors.backlog}
          tasks={backlog}
          allTasks={tasks}
          plansMap={plansMap}
          onTaskClick={onTaskClick}
          onTaskEdit={onTaskEdit}
          onAddTask={() => onAddTask?.('backlog')}
          defaultExpanded={true}
          dropData={{ type: 'state', state: 'backlog' }}
        />

        {/* Done */}
        {done.length > 0 && (
          <DroppableGroup
            id="state-done"
            title="Done"
            titleColor={stateColors.done}
            tasks={done}
            allTasks={tasks}
            plansMap={plansMap}
            onTaskClick={onTaskClick}
            onTaskEdit={onTaskEdit}
            defaultExpanded={false}
            dropData={{ type: 'state', state: 'done' }}
          />
        )}

        {/* Cancelled */}
        {cancelled.length > 0 && (
          <DroppableGroup
            id="state-cancelled"
            title="Cancelled"
            titleColor={stateColors.cancelled}
            tasks={cancelled}
            allTasks={tasks}
            plansMap={plansMap}
            onTaskClick={onTaskClick}
            onTaskEdit={onTaskEdit}
            defaultExpanded={false}
            dropData={{ type: 'state', state: 'cancelled' }}
          />
        )}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeTask ? (
          <div className="bg-background border rounded-lg shadow-lg opacity-90">
            <TaskListItem
              task={activeTask}
              planName={plansMap.get(activeTask.planId)}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default TaskList;
