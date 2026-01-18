/**
 * TaskFilters - Filter bar for task list
 * Includes search, plan filter, and tag filter
 */

import { TaskFilters as TaskFiltersType } from '@/hooks/useTasks';
import { usePlans } from '@/hooks/usePlans';
import { useTags } from '@/hooks/useTags';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TaskFiltersProps {
  filters: TaskFiltersType;
  onFiltersChange: (filters: TaskFiltersType) => void;
  className?: string;
}

export function TaskFilters({
  filters,
  onFiltersChange,
  className,
}: TaskFiltersProps) {
  const { plans } = usePlans();
  const { data: tags } = useTags();

  const handlePlanChange = (value: string) => {
    if (value === 'all') {
      const { plan_id, ...rest } = filters;
      onFiltersChange(rest);
    } else {
      onFiltersChange({ ...filters, plan_id: value });
    }
  };

  const handleTagChange = (value: string) => {
    if (value === 'all') {
      const { tag_id, ...rest } = filters;
      onFiltersChange(rest);
    } else {
      onFiltersChange({ ...filters, tag_id: value });
    }
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = filters.plan_id || filters.tag_id;

  // Find selected items for display
  const selectedPlan = plans.find(p => String(p.id) === String(filters.plan_id));
  const selectedTag = tags?.find(t => String(t.id) === String(filters.tag_id));

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          className="pl-8 w-[200px] h-9"
        />
      </div>

      {/* Plan filter */}
      <Select
        value={filters.plan_id ? String(filters.plan_id) : 'all'}
        onValueChange={handlePlanChange}
      >
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="All plans" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All plans</SelectItem>
          {plans.map((plan) => (
            <SelectItem key={plan.id} value={String(plan.id)}>
              {plan.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Tag filter */}
      <Select
        value={filters.tag_id ? String(filters.tag_id) : 'all'}
        onValueChange={handleTagChange}
      >
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="All tags" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All tags</SelectItem>
          {tags?.map((tag) => (
            <SelectItem key={tag.id} value={String(tag.id)}>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: tag.attributes.color || '#6B7280' }}
                />
                {tag.attributes.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear filters button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-9 px-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Clear filters
        </Button>
      )}

      {/* Active filter badges */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1 ml-2">
          {selectedPlan && (
            <Badge variant="secondary" className="text-xs">
              Plan: {selectedPlan.name}
            </Badge>
          )}
          {selectedTag && (
            <Badge
              variant="secondary"
              className="text-xs"
              style={{
                backgroundColor: `${selectedTag.attributes.color}20`,
                borderColor: selectedTag.attributes.color,
              }}
            >
              Tag: {selectedTag.attributes.name}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

export default TaskFilters;
