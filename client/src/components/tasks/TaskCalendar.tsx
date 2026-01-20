/**
 * TaskCalendar - Month view calendar for tasks
 * Displays tasks by their target_date in a traditional calendar grid
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { Task } from '@/hooks/useTasks';
import { usePlans, Plan } from '@/hooks/usePlans';
import { useTags } from '@/hooks/useTags';
import { Tag } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Circle, CheckCircle2, Folder } from 'lucide-react';

interface TaskCalendarProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  className?: string;
}

// Helper to strip HTML tags and decode entities
function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

// State colors for task dots
const stateColors: Record<string, string> = {
  backlog: 'bg-slate-400',
  todo: 'bg-amber-500',
  in_progress: 'bg-purple-500',
  done: 'bg-green-500',
  cancelled: 'bg-gray-400',
};

const stateBorderColors: Record<string, string> = {
  backlog: 'border-slate-400',
  todo: 'border-amber-500',
  in_progress: 'border-purple-500',
  done: 'border-green-500',
  cancelled: 'border-gray-400',
};

export function TaskCalendar({ tasks, onTaskClick, className }: TaskCalendarProps) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Fetch plans and tags for hover tooltips
  const { plans } = usePlans();
  const { data: tags } = useTags();

  // Create lookup maps
  const plansMap = useMemo(
    () => new Map<number, Plan>(plans?.map((p) => [parseInt(p.id, 10), p]) || []),
    [plans]
  );

  const tagsMap = useMemo(
    () => new Map<string, Tag>(tags?.map((t) => [t.id, t]) || []),
    [tags]
  );

  // Get all days to display in the calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();

    tasks.forEach((task) => {
      if (task.targetDate) {
        const dateKey = format(new Date(task.targetDate), 'yyyy-MM-dd');
        const existing = map.get(dateKey) || [];
        existing.push(task);
        map.set(dateKey, existing);
      }
    });

    return map;
  }, [tasks]);

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleTaskClick = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTaskClick) {
      onTaskClick(task);
    } else {
      navigate(`/tasks/${task.id}`);
    }
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToday}
            className="text-xs"
          >
            Today
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handlePrevMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleNextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Week day headers */}
        <div className="grid grid-cols-7 bg-muted/50 border-b">
          {weekDays.map((day) => (
            <div
              key={day}
              className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7" style={{ gridAutoRows: 'minmax(100px, auto)' }}>
          {calendarDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDate.get(dateKey) || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={dateKey}
                className={cn(
                  'min-h-[100px] border-b border-r p-1 transition-colors',
                  !isCurrentMonth && 'bg-muted/30',
                  isCurrentDay && 'bg-primary/5'
                )}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full',
                      !isCurrentMonth && 'text-muted-foreground',
                      isCurrentDay && 'bg-primary text-primary-foreground'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayTasks.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{dayTasks.length - 3}
                    </span>
                  )}
                </div>

                {/* Tasks */}
                <div className="space-y-0.5 overflow-hidden">
                  {dayTasks.slice(0, 3).map((task) => {
                    const plan = plansMap.get(task.planId);
                    const taskTags = task.tagIds
                      ?.map((id) => tagsMap.get(id))
                      .filter(Boolean) as Tag[] || [];
                    const description = stripHtml(task.description);

                    return (
                      <HoverCard key={task.id} openDelay={300} closeDelay={100}>
                        <HoverCardTrigger asChild>
                          <button
                            onClick={(e) => handleTaskClick(task, e)}
                            className={cn(
                              'w-full text-left text-xs px-1.5 py-0.5 rounded truncate transition-colors',
                              'hover:bg-accent flex items-center gap-1',
                              task.state === 'done' && 'line-through text-muted-foreground'
                            )}
                          >
                            {task.state === 'done' ? (
                              <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-green-500" />
                            ) : (
                              <Circle
                                className={cn(
                                  'h-3 w-3 flex-shrink-0',
                                  stateColors[task.state]?.replace('bg-', 'text-')
                                )}
                              />
                            )}
                            <span className="truncate">{task.title}</span>
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent
                          side="right"
                          align="start"
                          className="w-80 p-3"
                        >
                          {/* Task title */}
                          <div className="font-medium text-sm mb-2">{task.title}</div>

                          {/* Plan */}
                          {plan && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                              <Folder className="h-3 w-3" />
                              <span>{plan.name}</span>
                            </div>
                          )}

                          {/* Tags */}
                          {taskTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {taskTags.map((tag) => (
                                <Badge
                                  key={tag.id}
                                  variant="secondary"
                                  className="text-xs px-1.5 py-0"
                                  style={{
                                    backgroundColor: tag.attributes.color + '20',
                                    color: tag.attributes.color,
                                    borderColor: tag.attributes.color,
                                  }}
                                >
                                  {tag.attributes.name}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Description */}
                          {description && (
                            <p className="text-xs text-muted-foreground line-clamp-4">
                              {description}
                            </p>
                          )}

                          {/* Empty state */}
                          {!description && taskTags.length === 0 && !plan && (
                            <p className="text-xs text-muted-foreground italic">
                              No additional details
                            </p>
                          )}
                        </HoverCardContent>
                      </HoverCard>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-slate-400" />
          <span>Backlog</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Todo</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>Done</span>
        </div>
      </div>
    </div>
  );
}

export default TaskCalendar;
