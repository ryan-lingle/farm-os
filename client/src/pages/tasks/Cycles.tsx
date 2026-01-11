/**
 * Cycles page - List and manage cycles (sprints/time periods)
 */

import { useState } from 'react';
import { useCycles, Cycle, useCurrentCycle, useCreateCycle, useDeleteCycle, useGenerateCycles } from '@/hooks/useCycles';
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
  CalendarRange,
  MoreHorizontal,
  Trash2,
  Calendar,
  CheckCircle2,
  Circle,
  ListTodo,
  Repeat,
} from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';
import { Link } from 'react-router-dom';

function CycleCard({ cycle, isCurrent }: { cycle: Cycle; isCurrent?: boolean }) {
  const deleteCycle = useDeleteCycle();

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this cycle?')) {
      deleteCycle.mutate(cycle.id);
    }
  };

  const taskCount = cycle.taskCount ?? 0;
  const completedCount = cycle.completedTaskCount ?? 0;
  const progress = cycle.taskCompletionPercentage ?? (taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0);
  const timeProgress = cycle.progressPercentage ?? 0;

  return (
    <Card className={cn(
      'hover:shadow-md transition-shadow',
      isCurrent && 'border-purple-300 bg-purple-50/30'
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {cycle.name}
                {isCurrent && (
                  <Badge className="bg-purple-100 text-purple-700 text-xs">
                    Current
                  </Badge>
                )}
              </CardTitle>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/tasks?cycle=${cycle.id}`}>
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
        <CardDescription className="mt-1">
          {format(new Date(cycle.startDate), 'MMM d')} - {format(new Date(cycle.endDate), 'MMM d, yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Task Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Task Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Time Progress (for current cycle) */}
          {isCurrent && (
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Time Elapsed</span>
                <span className="font-medium">{timeProgress}%</span>
              </div>
              <Progress value={timeProgress} className="h-2 bg-purple-100 [&>div]:bg-purple-500" />
            </div>
          )}

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
            {cycle.daysRemaining !== undefined && cycle.daysRemaining > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{cycle.daysRemaining}d left</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateCycleDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const createCycle = useCreateCycle();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) return;

    try {
      await createCycle.mutateAsync({
        name: name.trim(),
        startDate,
        endDate,
      });
      setName('');
      setStartDate('');
      setEndDate('');
      setOpen(false);
    } catch (error) {
      console.error('Failed to create cycle:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Cycle
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Cycle</DialogTitle>
            <DialogDescription>
              Cycles are time periods for scheduling and tracking tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="e.g., Week 1, January Sprint"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
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
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || !startDate || !endDate || createCycle.isPending}>
              {createCycle.isPending ? 'Creating...' : 'Create Cycle'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GenerateCyclesDialog() {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [count, setCount] = useState(4);
  const [durationDays, setDurationDays] = useState(7);
  const generateCycles = useGenerateCycles();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || count < 1) return;

    try {
      await generateCycles.mutateAsync({
        startDate,
        count,
        durationDays,
      });
      setOpen(false);
    } catch (error) {
      console.error('Failed to generate cycles:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Repeat className="h-4 w-4 mr-2" />
          Generate Cycles
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Generate Multiple Cycles</DialogTitle>
            <DialogDescription>
              Quickly create multiple consecutive cycles (e.g., for weekly sprints).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Number of Cycles</label>
                <Input
                  type="number"
                  min={1}
                  max={52}
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Days per Cycle</label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={durationDays}
                  onChange={(e) => setDurationDays(parseInt(e.target.value) || 7)}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              This will create {count} cycles of {durationDays} days each, starting {startDate}.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!startDate || count < 1 || generateCycles.isPending}>
              {generateCycles.isPending ? 'Generating...' : `Generate ${count} Cycles`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Cycles() {
  const { cycles, isLoading } = useCycles();
  const { data: currentCycle } = useCurrentCycle();

  // Group cycles
  const futureCycles = cycles.filter(c => c.isFuture);
  const pastCycles = cycles.filter(c => c.isPast);
  const currentCycleInList = cycles.find(c => c.isCurrent);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cycles</h1>
          <p className="text-sm text-muted-foreground">
            Time periods for scheduling and tracking task progress
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GenerateCyclesDialog />
          <CreateCycleDialog />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading cycles...</div>
        </div>
      ) : cycles.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <CalendarRange className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No cycles yet</h3>
              <p className="text-muted-foreground mb-4">
                Create cycles to organize tasks into time periods
              </p>
              <div className="flex items-center justify-center gap-2">
                <GenerateCyclesDialog />
                <CreateCycleDialog />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Current Cycle */}
          {currentCycleInList && (
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                Current Cycle
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <CycleCard cycle={currentCycleInList} isCurrent />
              </div>
            </section>
          )}

          {/* Future Cycles */}
          {futureCycles.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                Upcoming ({futureCycles.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {futureCycles.map(cycle => (
                  <CycleCard key={cycle.id} cycle={cycle} />
                ))}
              </div>
            </section>
          )}

          {/* Past Cycles */}
          {pastCycles.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                Past ({pastCycles.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastCycles.map(cycle => (
                  <CycleCard key={cycle.id} cycle={cycle} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
