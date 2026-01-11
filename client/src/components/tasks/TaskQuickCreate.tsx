/**
 * TaskQuickCreate - Minimal inline task creation
 * Type title + Enter to create, Tab to expand
 */

import { useState, useRef, useEffect } from 'react';
import { useCreateTask, TaskState } from '@/hooks/useTasks';
import { usePlans, Plan } from '@/hooks/usePlans';
import { useCycles, Cycle } from '@/hooks/useCycles';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import { Plus, ChevronDown, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface TaskQuickCreateProps {
  defaultPlanId?: number;
  defaultCycleId?: number;
  defaultState?: TaskState;
  onCreated?: () => void;
  className?: string;
}

export function TaskQuickCreate({
  defaultPlanId,
  defaultCycleId,
  defaultState = 'backlog',
  onCreated,
  className,
}: TaskQuickCreateProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [planId, setPlanId] = useState<number | undefined>(defaultPlanId);
  const [cycleId, setCycleId] = useState<number | undefined>(defaultCycleId);
  const [targetDate, setTargetDate] = useState<Date | undefined>();
  const [estimate, setEstimate] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const createTask = useCreateTask();
  const { plans } = usePlans();
  const { cycles, currentCycle } = useCycles();

  // Auto-select current cycle if none selected
  useEffect(() => {
    if (!cycleId && currentCycle) {
      setCycleId(parseInt(currentCycle.id, 10));
    }
  }, [currentCycle, cycleId]);

  // Auto-select first plan if none selected
  useEffect(() => {
    if (!planId && plans.length > 0) {
      setPlanId(parseInt(plans[0].id, 10));
    }
  }, [plans, planId]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!title.trim() || !planId) return;

    // Parse estimate (e.g., "2h", "30m", "1.5h")
    let estimateMinutes: number | undefined;
    if (estimate) {
      const match = estimate.match(/^(\d+(?:\.\d+)?)(h|m)?$/i);
      if (match) {
        const value = parseFloat(match[1]);
        const unit = (match[2] || 'h').toLowerCase();
        estimateMinutes = unit === 'h' ? Math.round(value * 60) : Math.round(value);
      }
    }

    try {
      await createTask.mutateAsync({
        title: title.trim(),
        planId,
        state: defaultState,
        cycleId,
        estimate: estimateMinutes,
        targetDate: targetDate?.toISOString().split('T')[0],
      });

      // Reset form
      setTitle('');
      setEstimate('');
      setTargetDate(undefined);
      setIsExpanded(false);
      onCreated?.();

      // Re-focus input for quick successive adds
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Tab' && !isExpanded) {
      e.preventDefault();
      setIsExpanded(true);
    } else if (e.key === 'Escape') {
      setTitle('');
      setIsExpanded(false);
    }
  };

  return (
    <div className={cn('border rounded-lg bg-card', className)}>
      <form onSubmit={handleSubmit}>
        {/* Main input row */}
        <div className="flex items-center gap-2 p-2">
          <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a task... (Enter to create, Tab for options)"
            className="border-0 shadow-none focus-visible:ring-0 p-0 h-8"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 h-7"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                isExpanded && 'rotate-180'
              )}
            />
          </Button>
        </div>

        {/* Expanded options */}
        {isExpanded && (
          <div className="border-t px-4 py-3 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Plan selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Plan:</span>
                <Select
                  value={planId?.toString()}
                  onValueChange={(v) => setPlanId(parseInt(v, 10))}
                >
                  <SelectTrigger className="w-[150px] h-8 text-xs">
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
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Cycle:</span>
                <Select
                  value={cycleId?.toString() || 'none'}
                  onValueChange={(v) => setCycleId(v === 'none' ? undefined : parseInt(v, 10))}
                >
                  <SelectTrigger className="w-[150px] h-8 text-xs">
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

              {/* Estimate input */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Est:</span>
                <Input
                  value={estimate}
                  onChange={(e) => setEstimate(e.target.value)}
                  placeholder="e.g., 2h"
                  className="w-[80px] h-8 text-xs"
                />
              </div>

              {/* Target date */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Due:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-[130px] h-8 justify-start text-left font-normal text-xs',
                        !targetDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {targetDate ? format(targetDate, 'MMM d, yyyy') : 'Pick date'}
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
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button
                type="submit"
                size="sm"
                disabled={!title.trim() || !planId || createTask.isPending}
              >
                {createTask.isPending ? 'Creating...' : 'Create Task'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTitle('');
                  setIsExpanded(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

export default TaskQuickCreate;
