/**
 * PlanDetail page - Show plan details and its tasks
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePlan, useUpdatePlan, useDeletePlan, PlanStatus } from '@/hooks/usePlans';
import { useTasks, Task, TaskFilters as TaskFiltersType } from '@/hooks/useTasks';
import { useCreateConversation } from '@/hooks/useConversations';
import { TaskList, TaskQuickCreate, TaskDetailPanel } from '@/components/tasks';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  FolderKanban,
  MessageSquare,
  MoreHorizontal,
  Trash2,
  Edit,
  Calendar,
  CheckCircle2,
  Circle,
  Play,
  Check,
  X,
} from 'lucide-react';
import { format } from 'date-fns';

// Status badge colors
const statusColors: Record<PlanStatus, { bg: string; text: string }> = {
  planned: { bg: 'bg-slate-100', text: 'text-slate-600' },
  active: { bg: 'bg-purple-100', text: 'text-purple-700' },
  completed: { bg: 'bg-green-100', text: 'text-green-700' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500' },
};

const statusLabels: Record<PlanStatus, string> = {
  planned: 'Planned',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function EditPlanDialog({
  plan,
  open,
  onOpenChange,
}: {
  plan: {
    id: string;
    name: string;
    description?: string | null;
    status: PlanStatus;
    startDate?: string | null;
    targetDate?: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description || '');
  const [status, setStatus] = useState<PlanStatus>(plan.status);
  const [startDate, setStartDate] = useState(plan.startDate || '');
  const [targetDate, setTargetDate] = useState(plan.targetDate || '');
  const updatePlan = useUpdatePlan();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await updatePlan.mutateAsync({
        id: plan.id,
        updates: {
          name: name.trim(),
          description: description.trim() || null,
          status,
          startDate: startDate || null,
          targetDate: targetDate || null,
        },
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update plan:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Plan</DialogTitle>
            <DialogDescription>Update plan details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as PlanStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Date</label>
                <Input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || updatePlan.isPending}>
              {updatePlan.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: plan, isLoading: planLoading } = usePlan(id);
  const { tasks, isLoading: tasksLoading } = useTasks({ plan_id: id ? parseInt(id, 10) : undefined });
  const deletePlan = useDeletePlan();
  const updatePlan = useUpdatePlan();
  const createConversation = useCreateConversation();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [description, setDescription] = useState('');

  // Sync local description state with plan data
  useEffect(() => {
    if (plan) {
      setDescription(plan.description || '');
    }
  }, [plan]);

  // Handle description changes
  const handleDescriptionChange = useCallback((html: string) => {
    setDescription(html);
  }, []);

  const handleDescriptionBlur = useCallback(() => {
    if (plan && description !== (plan.description || '')) {
      updatePlan.mutate({ id: plan.id, updates: { description } });
    }
  }, [plan, description, updatePlan]);

  const handleTaskClick = (task: Task) => {
    navigate(`/tasks/${task.id}`);
  };

  const handleTaskEdit = (task: Task) => {
    setSelectedTaskId(task.id);
    setDetailPanelOpen(true);
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this plan? All tasks in this plan will be orphaned.')) {
      try {
        await deletePlan.mutateAsync(id!);
        navigate('/tasks/plans');
      } catch (error) {
        console.error('Failed to delete plan:', error);
      }
    }
  };

  const handleStatusChange = async (newStatus: PlanStatus) => {
    try {
      await updatePlan.mutateAsync({
        id: id!,
        updates: { status: newStatus },
      });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleChatAboutPlan = async () => {
    if (plan) {
      const conversation = await createConversation.mutateAsync({
        title: `Chat about: ${plan.name}`,
        planId: parseInt(plan.id, 10),
      });
      navigate(`/chat/${conversation.id}`);
    }
  };

  if (planLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading plan...</div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <FolderKanban className="h-12 w-12 text-muted-foreground opacity-50" />
        <div className="text-muted-foreground">Plan not found</div>
        <Button asChild variant="outline">
          <Link to="/tasks/plans">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Plans
          </Link>
        </Button>
      </div>
    );
  }

  const statusColor = statusColors[plan.status];
  const taskCount = plan.taskCount ?? tasks.length;
  const completedCount = plan.completedTaskCount ?? tasks.filter(t => t.state === 'done').length;
  const progress = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-4 mb-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/tasks/plans">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <FolderKanban className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-2xl font-bold">{plan.name}</h1>
              <Badge className={cn('text-sm', statusColor.bg, statusColor.text)}>
                {statusLabels[plan.status]}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Quick status actions */}
            {plan.status === 'planned' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('active')}
              >
                <Play className="h-4 w-4 mr-2" />
                Start
              </Button>
            )}
            {plan.status === 'active' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('completed')}
              >
                <Check className="h-4 w-4 mr-2" />
                Complete
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleChatAboutPlan}
              disabled={createConversation.isPending}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat about this plan
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Plan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Plan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 ml-9">
          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="w-32">
              <Progress value={progress} className="h-2" />
            </div>
            <span className="text-sm text-muted-foreground">{progress}%</span>
          </div>

          {/* Task counts */}
          <div className="flex items-center gap-1.5 text-sm">
            <Circle className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{taskCount} tasks</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{completedCount} done</span>
          </div>

          {/* Dates */}
          {(plan.startDate || plan.targetDate) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {plan.startDate && (
                <span>{format(new Date(plan.startDate), 'MMM d')}</span>
              )}
              {plan.startDate && plan.targetDate && <span>-</span>}
              {plan.targetDate && (
                <span>{format(new Date(plan.targetDate), 'MMM d, yyyy')}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Plan Description - Rich Text Editor */}
        <div className="mb-6">
          <RichTextEditor
            content={description}
            onChange={handleDescriptionChange}
            onBlur={handleDescriptionBlur}
            placeholder="Add a plan description, notes, or documentation..."
            className="min-h-[120px]"
            minimal
          />
        </div>

        {/* Quick create */}
        <TaskQuickCreate
          className="mb-6"
          defaultPlanId={parseInt(id!, 10)}
          onCreated={() => {}}
        />

        {/* Task list */}
        {tasksLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading tasks...</div>
          </div>
        ) : (
          <TaskList
            tasks={tasks}
            groupBy="state"
            onTaskClick={handleTaskClick}
            onTaskEdit={handleTaskEdit}
            emptyMessage="No tasks in this plan yet. Create your first task above!"
          />
        )}
      </div>

      {/* Task detail panel */}
      <TaskDetailPanel
        taskId={selectedTaskId}
        open={detailPanelOpen}
        onOpenChange={setDetailPanelOpen}
        onTaskSelect={handleTaskClick}
      />

      {/* Edit dialog */}
      {plan && (
        <EditPlanDialog
          plan={plan}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}
    </div>
  );
}
