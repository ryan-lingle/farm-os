/**
 * TaskFilters - Filter bar for task list
 * Linear-inspired with multi-select chips and dropdowns
 */

import { useState } from 'react';
import { TaskState, TaskFilters as TaskFiltersType } from '@/hooks/useTasks';
import { Plan, usePlans } from '@/hooks/usePlans';
import { Cycle, useCycles } from '@/hooks/useCycles';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Search, X, Filter, CalendarDays, FolderKanban } from 'lucide-react';

interface TaskFiltersProps {
  filters: TaskFiltersType;
  onFiltersChange: (filters: TaskFiltersType) => void;
  className?: string;
}

const allStates: TaskState[] = ['backlog', 'todo', 'in_progress', 'done', 'cancelled'];

const stateLabels: Record<TaskState, string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  in_progress: 'In Progress',
  done: 'Done',
  cancelled: 'Cancelled',
};

const stateColors: Record<TaskState, string> = {
  backlog: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  todo: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
  in_progress: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
  done: 'bg-green-100 text-green-700 hover:bg-green-200',
  cancelled: 'bg-gray-100 text-gray-500 hover:bg-gray-200',
};

export function TaskFilters({
  filters,
  onFiltersChange,
  className,
}: TaskFiltersProps) {
  const [searchValue, setSearchValue] = useState('');
  const { plans } = usePlans();
  const { cycles } = useCycles();

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== null && v !== ''
  ).length;

  const handleStateToggle = (state: TaskState) => {
    const currentState = filters.state;
    if (currentState === state) {
      onFiltersChange({ ...filters, state: undefined });
    } else {
      onFiltersChange({ ...filters, state });
    }
  };

  const handlePlanChange = (planId: string) => {
    if (planId === 'all') {
      onFiltersChange({ ...filters, plan_id: undefined });
    } else {
      onFiltersChange({ ...filters, plan_id: parseInt(planId, 10) });
    }
  };

  const handleCycleChange = (cycleId: string) => {
    if (cycleId === 'all') {
      onFiltersChange({ ...filters, cycle_id: undefined });
    } else if (cycleId === 'unscheduled') {
      onFiltersChange({ ...filters, cycle_id: undefined, unscheduled: true });
    } else {
      onFiltersChange({ ...filters, cycle_id: parseInt(cycleId, 10), unscheduled: undefined });
    }
  };

  const handleQuickFilter = (type: 'active' | 'overdue' | 'blocked') => {
    const newFilters = { ...filters };
    // Toggle the filter
    if (type === 'active') {
      newFilters.active = !filters.active;
      if (newFilters.active) {
        newFilters.completed = undefined;
        newFilters.overdue = undefined;
        newFilters.blocked = undefined;
      }
    } else if (type === 'overdue') {
      newFilters.overdue = !filters.overdue;
      if (newFilters.overdue) {
        newFilters.active = undefined;
        newFilters.completed = undefined;
        newFilters.blocked = undefined;
      }
    } else if (type === 'blocked') {
      newFilters.blocked = !filters.blocked;
      if (newFilters.blocked) {
        newFilters.active = undefined;
        newFilters.completed = undefined;
        newFilters.overdue = undefined;
      }
    }
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    onFiltersChange({});
    setSearchValue('');
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-8 w-[200px] h-9"
        />
      </div>

      {/* State filter chips */}
      <div className="flex items-center gap-1">
        {allStates.slice(0, 4).map((state) => (
          <button
            key={state}
            onClick={() => handleStateToggle(state)}
            className={cn(
              'px-2 py-1 rounded-md text-xs font-medium transition-colors',
              filters.state === state
                ? stateColors[state]
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            )}
          >
            {stateLabels[state]}
          </button>
        ))}
      </div>

      {/* Plan filter */}
      <Select
        value={filters.plan_id?.toString() || 'all'}
        onValueChange={handlePlanChange}
      >
        <SelectTrigger className="w-[150px] h-9">
          <FolderKanban className="h-4 w-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="All Plans" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Plans</SelectItem>
          {plans.map((plan) => (
            <SelectItem key={plan.id} value={plan.id}>
              {plan.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Cycle filter */}
      <Select
        value={
          filters.unscheduled
            ? 'unscheduled'
            : filters.cycle_id?.toString() || 'all'
        }
        onValueChange={handleCycleChange}
      >
        <SelectTrigger className="w-[150px] h-9">
          <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="All Cycles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Cycles</SelectItem>
          <SelectItem value="unscheduled">Unscheduled</SelectItem>
          {cycles.map((cycle) => (
            <SelectItem key={cycle.id} value={cycle.id}>
              {cycle.name}
              {cycle.isCurrent && ' (Current)'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Quick filters */}
      <div className="flex items-center gap-1 border-l pl-2 ml-1">
        <Button
          variant={filters.active ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 text-xs"
          onClick={() => handleQuickFilter('active')}
        >
          Active
        </Button>
        <Button
          variant={filters.overdue ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 text-xs text-amber-600"
          onClick={() => handleQuickFilter('overdue')}
        >
          Overdue
        </Button>
        <Button
          variant={filters.blocked ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 text-xs text-red-600"
          onClick={() => handleQuickFilter('blocked')}
        >
          Blocked
        </Button>
      </div>

      {/* Clear filters */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={clearFilters}
        >
          <X className="h-3 w-3 mr-1" />
          Clear ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}

export default TaskFilters;
