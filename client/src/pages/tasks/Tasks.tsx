/**
 * Tasks page - Main task list view
 * Linear-inspired task management interface
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTasks, Task, TaskFilters as TaskFiltersType } from '@/hooks/useTasks';
import { usePlans } from '@/hooks/usePlans';
import { TaskList, TaskCalendar, TaskFilters, TaskQuickCreate, TaskDetailPanel } from '@/components/tasks';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutList, Kanban, Calendar } from 'lucide-react';

export default function Tasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<TaskFiltersType>({});
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  // Read view mode from URL params, default to 'list'
  const viewParam = searchParams.get('view');
  const viewMode = (viewParam === 'calendar' || viewParam === 'board') ? viewParam : 'list';

  const setViewMode = (mode: 'list' | 'board' | 'calendar') => {
    if (mode === 'list') {
      searchParams.delete('view');
    } else {
      searchParams.set('view', mode);
    }
    setSearchParams(searchParams);
  };

  const { tasks, isLoading } = useTasks(filters);
  const { plans } = usePlans();

  // Quick edit opens side panel (used by dropdown menu)
  const handleQuickEdit = (task: Task) => {
    setSelectedTaskId(task.id);
    setDetailPanelOpen(true);
  };

  const handleAddTask = () => {
    // Focus the quick create input or open a modal
    // For now, scroll to the quick create component
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Tasks</h1>
            <p className="text-sm text-muted-foreground">
              Manage your farm tasks and track progress
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center border rounded-lg p-1">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode('calendar')}
                title="Calendar view"
              >
                <Calendar className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'board' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode('board')}
                title="Board view"
              >
                <Kanban className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <TaskFilters filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Quick create - hide in calendar view for cleaner UI */}
        {viewMode !== 'calendar' && (
          <TaskQuickCreate className="mb-6" onCreated={() => {}} />
        )}

        {/* Task views */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading tasks...</div>
          </div>
        ) : viewMode === 'list' ? (
          <TaskList
            tasks={tasks}
            plans={plans}
            groupBy="state"
            onTaskEdit={handleQuickEdit}
            onAddTask={handleAddTask}
            emptyMessage="No tasks found. Create your first task above!"
          />
        ) : viewMode === 'calendar' ? (
          <TaskCalendar
            tasks={tasks}
            onTaskClick={handleQuickEdit}
          />
        ) : (
          // TODO: Kanban board view
          <div className="text-center py-12 text-muted-foreground">
            Board view coming soon
          </div>
        )}
      </div>

      {/* Task detail panel (quick edit) */}
      <TaskDetailPanel
        taskId={selectedTaskId}
        open={detailPanelOpen}
        onOpenChange={setDetailPanelOpen}
        onTaskSelect={handleQuickEdit}
      />
    </div>
  );
}
