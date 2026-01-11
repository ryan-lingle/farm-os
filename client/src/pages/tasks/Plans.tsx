/**
 * Plans page - List and manage plans
 */

import { useState } from 'react';
import { usePlans, Plan, useCreatePlan, useDeletePlan, PlanStatus } from '@/hooks/usePlans';
import { useTasks } from '@/hooks/useTasks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Plus,
  FolderKanban,
  MoreHorizontal,
  Trash2,
  Calendar,
  CheckCircle2,
  Circle,
  ListTodo,
} from 'lucide-react';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';

// Strip HTML tags and truncate text for summaries
function stripHtmlAndTruncate(html: string, maxLength: number = 120): string {
  // Remove HTML tags
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

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

function PlanCard({ plan }: { plan: Plan }) {
  const deletePlan = useDeletePlan();
  const navigate = useNavigate();
  const { tasks } = useTasks({ plan_id: parseInt(plan.id, 10) });

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this plan?')) {
      deletePlan.mutate(plan.id);
    }
  };

  const handleClick = () => {
    navigate(`/tasks/plans/${plan.id}`);
  };

  const statusColor = statusColors[plan.status];
  const taskCount = plan.taskCount ?? tasks.length;
  const completedCount = plan.completedTaskCount ?? tasks.filter(t => t.state === 'done').length;
  const progress = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleClick}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">{plan.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn('text-xs', statusColor.bg, statusColor.text)}>
              {statusLabels[plan.status]}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to={`/tasks?plan=${plan.id}`}>
                    <ListTodo className="h-4 w-4 mr-2" />
                    View Tasks
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {plan.description && (
          <CardDescription className="mt-1 line-clamp-2">
            {stripHtmlAndTruncate(plan.description)}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Circle className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{taskCount} tasks</span>
            </div>
            <div className="flex items-center gap-1.5 text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{completedCount} done</span>
            </div>
          </div>

          {/* Dates */}
          {(plan.startDate || plan.targetDate) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
      </CardContent>
    </Card>
  );
}

function CreatePlanDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createPlan = useCreatePlan();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await createPlan.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        status: 'planned',
      });
      setName('');
      setDescription('');
      setOpen(false);
    } catch (error) {
      console.error('Failed to create plan:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Plan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Plan</DialogTitle>
            <DialogDescription>
              Plans help you organize and track related tasks together.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="e.g., Spring Planting 2024"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                placeholder="Brief description of the plan"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createPlan.isPending}>
              {createPlan.isPending ? 'Creating...' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Plans() {
  const { plans, isLoading } = usePlans();

  // Group plans by status
  const activePlans = plans.filter(p => p.status === 'active');
  const plannedPlans = plans.filter(p => p.status === 'planned');
  const completedPlans = plans.filter(p => p.status === 'completed');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plans</h1>
          <p className="text-sm text-muted-foreground">
            Organize tasks into plans to track larger projects
          </p>
        </div>
        <CreatePlanDialog />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading plans...</div>
        </div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FolderKanban className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No plans yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first plan to start organizing tasks
              </p>
              <CreatePlanDialog />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Active Plans */}
          {activePlans.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                Active ({activePlans.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activePlans.map(plan => (
                  <PlanCard key={plan.id} plan={plan} />
                ))}
              </div>
            </section>
          )}

          {/* Planned */}
          {plannedPlans.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-400" />
                Planned ({plannedPlans.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plannedPlans.map(plan => (
                  <PlanCard key={plan.id} plan={plan} />
                ))}
              </div>
            </section>
          )}

          {/* Completed */}
          {completedPlans.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Completed ({completedPlans.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedPlans.map(plan => (
                  <PlanCard key={plan.id} plan={plan} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
