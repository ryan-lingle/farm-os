/**
 * TaskFilters - Filter bar for task list
 * Simplified search-only filter bar
 */

import { useState } from 'react';
import { TaskFilters as TaskFiltersType } from '@/hooks/useTasks';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';

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
  const [searchValue, setSearchValue] = useState('');

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-8 w-[300px] h-9"
        />
      </div>
    </div>
  );
}

export default TaskFilters;
