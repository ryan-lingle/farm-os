/**
 * TaskDetailPanel - Slide-over panel for task editing
 * Linear-inspired full task editing with subtasks, relations, and associations
 */

import { useState, useEffect } from 'react';
import { Task, TaskState, useTask, useUpdateTask, useSubtasks } from '@/hooks/useTasks';
import { usePlans, Plan } from '@/hooks/usePlans';
import { useCycles, Cycle } from '@/hooks/useCycles';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  X,
  CalendarIcon,
  Clock,
  FolderKanban,
  CalendarDays,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { TaskList } from './TaskList';

interface TaskDetailPanelProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskSelect?: (task: Task) => void;
}

const stateOptions: { value: TaskState; label: string; color: string }[] = [
  { value: 'backlog', label: 'Backlog', color: 'bg-slate-100 text-slate-700' },
  { value: 'todo', label: 'Todo', color: 'bg-amber-100 text-amber-700' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-purple-100 text-purple-700' },
  { value: 'done', label: 'Done', color: 'bg-green-100 text-green-700' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-500' },
];

export function TaskDetailPanel({
  taskId,
  open,
  onOpenChange,
  onTaskSelect,
}: TaskDetailPanelProps) {
  const { data: task, isLoading } = useTask(taskId || undefined);
  const { subtasks } = useSubtasks(taskId || undefined);
  const { plans } = usePlans();
  const { cycles } = useCycles();
  const updateTask = useUpdateTask();

  // Local form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [state, setState] = useState<TaskState>('backlog');
  const [planId, setPlanId] = useState<number | undefined>();
  const [cycleId, setCycleId] = useState<number | undefined>();
  const [targetDate, setTargetDate] = useState<Date | undefined>();
  const [estimate, setEstimate] = useState('');

  // Update form when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setState(task.state);
      setPlanId(task.planId);
      setCycleId(task.cycleId || undefined);
      setTargetDate(task.targetDate ? new Date(task.targetDate) : undefined);
      setEstimate(task.estimateDisplay || '');
    }
  }, [task]);

  const handleSave = async () => {
    if (!taskId || !title.trim()) return;

    // Parse estimate
    let estimateMinutes: number | undefined;
    if (estimate) {
      const match = estimate.match(/^(\d+(?:\.\d+)?)(h|m)?$/i);
      if (match) {
        const value = parseFloat(match[1]);
        const unit = (match[2] || 'h').toLowerCase();
        estimateMinutes = unit === 'h' ? Math.round(value * 60) : Math.round(value);
      }
    }

    await updateTask.mutateAsync({
      id: taskId,
      updates: {
        title: title.trim(),
        description: description.trim() || null,
        state,
        planId,
        cycleId: cycleId || null,
        targetDate: targetDate?.toISOString().split('T')[0] || null,
        estimate: estimateMinutes ?? null,
      },
    });
  };

  // Auto-save on blur (debounced)
  const handleBlur = () => {
    if (task && (title !== task.title || description !== (task.description || ''))) {
      handleSave();
    }
  };

  if (!taskId) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] p-0 overflow-y-auto">
        {isLoading ? (
          <div className="p-6">Loading...</div>
        ) : task ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <SheetHeader className="p-4 border-b">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-sm font-medium text-muted-foreground">
                  Task Details
                </SheetTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </SheetHeader>

            {/* Content */}
            <div className="flex-1 p-4 space-y-6">
              {/* Title */}
              <div>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleBlur}
                  className="text-lg font-semibold border-0 p-0 h-auto focus-visible:ring-0 shadow-none"
                  placeholder="Task title"
                />
              </div>

              {/* State selector */}
              <div className="flex items-center gap-4">
                <Label className="text-sm text-muted-foreground w-20">Status</Label>
                <Select value={state} onValueChange={(v: TaskState) => setState(v)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stateOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2 h-2 rounded-full', opt.color)} />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Plan selector */}
              <div className="flex items-center gap-4">
                <Label className="text-sm text-muted-foreground w-20">
                  <FolderKanban className="h-4 w-4 inline mr-1" />
                  Plan
                </Label>
                <Select
                  value={planId?.toString()}
                  onValueChange={(v) => setPlanId(parseInt(v, 10))}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cycle selector */}
              <div className="flex items-center gap-4">
                <Label className="text-sm text-muted-foreground w-20">
                  <CalendarDays className="h-4 w-4 inline mr-1" />
                  Cycle
                </Label>
                <Select
                  value={cycleId?.toString() || 'none'}
                  onValueChange={(v) => setCycleId(v === 'none' ? undefined : parseInt(v, 10))}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="No cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No cycle</SelectItem>
                    {cycles.map((cycle) => (
                      <SelectItem key={cycle.id} value={cycle.id}>
                        {cycle.name}
                        {cycle.isCurrent && ' (Current)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target date */}
              <div className="flex items-center gap-4">
                <Label className="text-sm text-muted-foreground w-20">
                  <CalendarIcon className="h-4 w-4 inline mr-1" />
                  Due
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-[200px] justify-start text-left font-normal',
                        !targetDate && 'text-muted-foreground'
                      )}
                    >
                      {targetDate ? format(targetDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={targetDate}
                      onSelect={setTargetDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {targetDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTargetDate(undefined)}
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* Estimate */}
              <div className="flex items-center gap-4">
                <Label className="text-sm text-muted-foreground w-20">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Estimate
                </Label>
                <Input
                  value={estimate}
                  onChange={(e) => setEstimate(e.target.value)}
                  onBlur={handleSave}
                  placeholder="e.g., 2h, 30m"
                  className="w-[100px]"
                />
              </div>

              <Separator />

              {/* Description */}
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">
                  Description
                </Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleBlur}
                  placeholder="Add a description..."
                  className="min-h-[100px] resize-none"
                />
              </div>

              {/* Blocked indicator */}
              {task.isBlocked && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-700">
                    This task is blocked by {task.blockedByCount} other task(s)
                  </span>
                </div>
              )}

              {/* Subtasks */}
              {subtasks.length > 0 && (
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">
                    Subtasks ({subtasks.length})
                  </Label>
                  <TaskList
                    tasks={subtasks}
                    groupBy="none"
                    onTaskClick={(t) => onTaskSelect?.(t)}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t p-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={handleSave} disabled={updateTask.isPending}>
                {updateTask.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-muted-foreground">Task not found</div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default TaskDetailPanel;
