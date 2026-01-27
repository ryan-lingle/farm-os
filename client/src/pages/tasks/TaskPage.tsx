/**
 * TaskPage - Full task detail view with rich text editor
 * Linear-inspired layout with editable title, description, and metadata
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTask, useUpdateTask, useDeleteTask, TaskState, useSubtasks, Task } from '@/hooks/useTasks';
import { usePlans } from '@/hooks/usePlans';
import { useCycles } from '@/hooks/useCycles';
import { useTags } from '@/hooks/useTags';
import { useCreateConversation } from '@/hooks/useConversations';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { TaskList, TaskQuickCreate, TaskCalendar } from '@/components/tasks';
import { TagInput } from '@/components/tags';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  ExternalLink,
  FolderKanban,
  LayoutList,
  MessageSquare,
  MoreHorizontal,
  Trash2,
  AlertCircle,
  Tags,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BackReferences } from '@/components/BackReferences';
import { format } from 'date-fns';

// Helper to strip HTML tags for plain text description
function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

// Generate Google Calendar URL for a task
function generateGoogleCalendarUrl(task: {
  title: string;
  description?: string | null;
  targetDate?: string | null;
}): string {
  const baseUrl = 'https://calendar.google.com/calendar/render';
  const params = new URLSearchParams();

  params.set('action', 'TEMPLATE');
  params.set('text', task.title);

  // Add description (stripped of HTML)
  const plainDescription = stripHtml(task.description);
  if (plainDescription) {
    params.set('details', plainDescription);
  }

  // Add date as all-day event
  if (task.targetDate) {
    // Format: YYYYMMDD for all-day events
    const dateStr = task.targetDate.replace(/-/g, '');
    // For all-day events, end date should be the next day
    const startDate = new Date(task.targetDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
    const endDateStr = endDate.toISOString().split('T')[0].replace(/-/g, '');
    params.set('dates', `${dateStr}/${endDateStr}`);
  }

  return `${baseUrl}?${params.toString()}`;
}

// State options with colors
const stateOptions: { value: TaskState; label: string; color: string }[] = [
  { value: 'backlog', label: 'Backlog', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'todo', label: 'Todo', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'done', label: 'Done', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-500 border-gray-200' },
];

export default function TaskPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: task, isLoading } = useTask(id);
  const { subtasks } = useSubtasks(id);
  const { plans } = usePlans();
  const { cycles } = useCycles();
  const { data: allTags } = useTags();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createConversation = useCreateConversation();

  // Local state for editing
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimate, setEstimate] = useState('');

  // Subtask view state
  const [subtaskView, setSubtaskView] = useState<'all' | 'active' | 'completed'>('all');
  const [subtaskDisplayMode, setSubtaskDisplayMode] = useState<'list' | 'calendar'>('list');

  // Filter subtasks based on view
  const filteredSubtasks = useMemo(() => {
    if (!subtasks) return [];
    switch (subtaskView) {
      case 'active':
        return subtasks.filter((t: Task) => t.state === 'todo' || t.state === 'in_progress');
      case 'completed':
        return subtasks.filter((t: Task) => t.state === 'done' || t.state === 'cancelled');
      default:
        return subtasks;
    }
  }, [subtasks, subtaskView]);

  // Count subtasks by category
  const subtaskCounts = useMemo(() => {
    if (!subtasks) return { all: 0, active: 0, completed: 0 };
    return {
      all: subtasks.length,
      active: subtasks.filter((t: Task) => t.state === 'todo' || t.state === 'in_progress').length,
      completed: subtasks.filter((t: Task) => t.state === 'done' || t.state === 'cancelled').length,
    };
  }, [subtasks]);

  // Sync local state with task data
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setEstimate(task.estimateDisplay || '');
    }
  }, [task]);

  // Debounced save for description
  const handleDescriptionChange = useCallback((html: string) => {
    setDescription(html);
  }, []);

  const handleDescriptionBlur = useCallback(() => {
    if (task && description !== (task.description || '')) {
      updateTask.mutate({ id: task.id, updates: { description } });
    }
  }, [task, description, updateTask]);

  // Save title on blur
  const handleTitleBlur = useCallback(() => {
    if (task && title !== task.title && title.trim()) {
      updateTask.mutate({ id: task.id, updates: { title: title.trim() } });
    }
  }, [task, title, updateTask]);

  // Save estimate on blur
  const handleEstimateBlur = useCallback(() => {
    if (task && estimate !== (task.estimateDisplay || '')) {
      // Parse estimate string to minutes
      let minutes: number | null = null;
      const match = estimate.match(/(\d+)\s*(h|m|hr|min|hour|minute)?/gi);
      if (match) {
        minutes = 0;
        for (const m of match) {
          const num = parseInt(m);
          if (m.toLowerCase().includes('h')) {
            minutes += num * 60;
          } else {
            minutes += num;
          }
        }
      }
      updateTask.mutate({ id: task.id, updates: { estimate: minutes } });
    }
  }, [task, estimate, updateTask]);

  // Update field handlers
  const handleStateChange = (state: TaskState) => {
    if (task) {
      updateTask.mutate({ id: task.id, updates: { state } });
    }
  };

  const handlePlanChange = (planId: string) => {
    if (task) {
      updateTask.mutate({ id: task.id, updates: { planId: parseInt(planId, 10) } });
    }
  };

  const handleCycleChange = (cycleId: string) => {
    if (task) {
      const value = cycleId === 'none' ? null : parseInt(cycleId, 10);
      updateTask.mutate({ id: task.id, updates: { cycleId: value } });
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    if (task) {
      updateTask.mutate({
        id: task.id,
        updates: { targetDate: date ? format(date, 'yyyy-MM-dd') : null },
      });
    }
  };

  const handleTagsChange = (tagIds: string[]) => {
    if (task) {
      updateTask.mutate({
        id: task.id,
        updates: { tagIds: tagIds.map((id) => parseInt(id, 10)) },
      });
    }
  };

  const handleDelete = () => {
    if (task && confirm('Are you sure you want to delete this task?')) {
      deleteTask.mutate(task.id);
      navigate('/tasks');
    }
  };

  const handleChatAboutTask = async () => {
    if (task) {
      const conversation = await createConversation.mutateAsync({
        title: `Chat about: ${task.title}`,
        taskId: parseInt(task.id, 10),
      });
      navigate(`/chat/${conversation.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading task...</div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Task not found</p>
        <Button variant="outline" onClick={() => navigate('/tasks')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tasks
        </Button>
      </div>
    );
  }

  const currentPlan = plans?.find((p) => parseInt(p.id, 10) === task.planId);
  const currentCycle = cycles?.find((c) => parseInt(c.id, 10) === task.cycleId);
  const currentState = stateOptions.find((s) => s.value === task.state);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/tasks')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/tasks" className="hover:text-foreground">
              Tasks
            </Link>
            <span>/</span>
            {currentPlan && (
              <>
                <Link
                  to={`/tasks/plans/${currentPlan.id}`}
                  className="hover:text-foreground"
                >
                  {currentPlan.name}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {task.title}
            </span>
          </div>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <a
              href={generateGoogleCalendarUrl(task)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Add to Google Calendar
              <ExternalLink className="h-3 w-3 ml-1 opacity-50" />
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleChatAboutTask}
            disabled={createConversation.isPending}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat about this task
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-4">
              {/* Title - Large, editable like Linear */}
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                placeholder="Task title"
                className="text-3xl font-semibold border-none shadow-none px-0 focus-visible:ring-0 h-auto py-1 tracking-tight"
              />

              {/* State badge - inline, minimal */}
              <div className="flex items-center gap-3">
                <Select value={task.state} onValueChange={handleStateChange}>
                  <SelectTrigger className="w-auto border-none shadow-none p-0 h-auto focus:ring-0">
                    <Badge
                      variant="outline"
                      className={cn('cursor-pointer text-xs', currentState?.color)}
                    >
                      {currentState?.label}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    {stateOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <Badge variant="outline" className={cn('text-xs', option.color)}>
                          {option.label}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {task.isBlocked && (
                  <Badge variant="destructive" className="text-xs">Blocked</Badge>
                )}
              </div>

              {/* Description Editor - Linear-style invisible editor */}
              <RichTextEditor
                content={description}
                onChange={handleDescriptionChange}
                onBlur={handleDescriptionBlur}
                placeholder="Add a description..."
                className="min-h-[200px]"
                minimal
              />
            </div>

            {/* Sidebar - Clean, minimal like Linear */}
            <div className="space-y-1">
              {/* Properties list */}
              <div className="divide-y divide-border/50">
                {/* Plan */}
                <div className="flex items-center py-3">
                  <div className="flex items-center gap-2 w-24 text-sm text-muted-foreground">
                    <FolderKanban className="h-4 w-4" />
                    <span>Plan</span>
                  </div>
                  <Select
                    value={String(task.planId)}
                    onValueChange={handlePlanChange}
                  >
                    <SelectTrigger className="border-none shadow-none h-auto p-0 w-auto focus:ring-0">
                      <span className="text-sm">{currentPlan?.name || 'Select plan'}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {plans?.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cycle */}
                <div className="flex items-center py-3">
                  <div className="flex items-center gap-2 w-24 text-sm text-muted-foreground">
                    <CalendarIcon className="h-4 w-4" />
                    <span>Cycle</span>
                  </div>
                  <Select
                    value={task.cycleId ? String(task.cycleId) : 'none'}
                    onValueChange={handleCycleChange}
                  >
                    <SelectTrigger className="border-none shadow-none h-auto p-0 w-auto focus:ring-0">
                      <span className="text-sm">
                        {currentCycle?.name || 'No cycle'}
                        {currentCycle?.isCurrent && ' (Current)'}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No cycle</SelectItem>
                      {cycles?.map((cycle) => (
                        <SelectItem key={cycle.id} value={cycle.id}>
                          {cycle.name}
                          {cycle.isCurrent && ' (Current)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Target Date */}
                <div className="flex items-center py-3">
                  <div className="flex items-center gap-2 w-24 text-sm text-muted-foreground">
                    <CalendarIcon className="h-4 w-4" />
                    <span>Due</span>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          'h-auto p-0 font-normal hover:bg-transparent',
                          !task.targetDate && 'text-muted-foreground'
                        )}
                      >
                        <span className="text-sm">
                          {task.targetDate
                            ? format(new Date(task.targetDate), 'MMM d, yyyy')
                            : 'No date'}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={task.targetDate ? new Date(task.targetDate) : undefined}
                        onSelect={handleDateChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Estimate */}
                <div className="flex items-center py-3">
                  <div className="flex items-center gap-2 w-24 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Estimate</span>
                  </div>
                  <Input
                    value={estimate}
                    onChange={(e) => setEstimate(e.target.value)}
                    onBlur={handleEstimateBlur}
                    placeholder="None"
                    className="border-none shadow-none h-auto p-0 w-auto text-sm focus-visible:ring-0"
                  />
                </div>

                {/* Tags */}
                <div className="flex items-start py-3">
                  <div className="flex items-center gap-2 w-24 text-sm text-muted-foreground pt-0.5">
                    <Tags className="h-4 w-4" />
                    <span>Tags</span>
                  </div>
                  <div className="flex-1">
                    <TagInput
                      selectedTagIds={task.tagIds || []}
                      onTagsChange={handleTagsChange}
                    />
                  </div>
                </div>
              </div>

              {/* Back References - plans that reference this task */}
              {(task.referencingPlanCount ?? 0) > 0 && (
                <div className="pt-4 border-t">
                  <BackReferences
                    entityType="task"
                    referencingPlanCount={task.referencingPlanCount}
                  />
                </div>
              )}

              {/* Metadata - subtle footer */}
              <div className="pt-4 text-xs text-muted-foreground/70 space-y-1">
                <p>Created {format(new Date(task.createdAt), 'MMM d, yyyy')}</p>
                <p>Updated {format(new Date(task.updatedAt), 'MMM d, yyyy')}</p>
              </div>
            </div>
          </div>

          {/* Subtasks Section - Full width below the grid */}
          <div className="border-t pt-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">
                Subtasks
                {subtaskCounts.all > 0 && (
                  <span className="text-muted-foreground ml-1">
                    ({subtaskCounts.completed}/{subtaskCounts.all})
                  </span>
                )}
              </h3>

              <div className="flex items-center gap-2">
                {/* View mode toggle (list/calendar) */}
                {subtaskCounts.all > 0 && (
                  <div className="flex items-center border rounded-lg p-0.5">
                    <Button
                      variant={subtaskDisplayMode === 'list' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => setSubtaskDisplayMode('list')}
                      title="List view"
                    >
                      <LayoutList className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant={subtaskDisplayMode === 'calendar' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => setSubtaskDisplayMode('calendar')}
                      title="Calendar view"
                    >
                      <CalendarIcon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}

                {/* Filter tabs (only for list view) */}
                {subtaskCounts.all > 0 && subtaskDisplayMode === 'list' && (
                  <Tabs value={subtaskView} onValueChange={(v) => setSubtaskView(v as 'all' | 'active' | 'completed')}>
                    <TabsList className="h-8">
                      <TabsTrigger value="all" className="text-xs px-3 h-6">
                        All ({subtaskCounts.all})
                      </TabsTrigger>
                      <TabsTrigger value="active" className="text-xs px-3 h-6">
                        Active ({subtaskCounts.active})
                      </TabsTrigger>
                      <TabsTrigger value="completed" className="text-xs px-3 h-6">
                        Completed ({subtaskCounts.completed})
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}
              </div>
            </div>

            {/* Quick create subtask */}
            <TaskQuickCreate
              className="mb-4"
              defaultParentId={id ? parseInt(id, 10) : undefined}
              defaultPlanId={task?.planId}
              placeholder="Add a subtask..."
              onCreated={() => {}}
            />

            {/* Subtask display - list or calendar */}
            {subtaskDisplayMode === 'calendar' ? (
              subtasks && subtasks.length > 0 ? (
                <TaskCalendar
                  tasks={subtasks}
                  onTaskClick={(t) => navigate(`/tasks/${t.id}`)}
                />
              ) : (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  No subtasks to display in calendar
                </div>
              )
            ) : (
              /* List view with filtering */
              filteredSubtasks.length > 0 ? (
                <TaskList
                  tasks={filteredSubtasks}
                  plans={plans}
                  groupBy="state"
                  onTaskClick={(t) => navigate(`/tasks/${t.id}`)}
                  emptyMessage="No subtasks"
                />
              ) : subtaskCounts.all > 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  No {subtaskView} subtasks
                </div>
              ) : null
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
