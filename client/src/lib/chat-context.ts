/**
 * Context builders for the "Chat About" feature.
 * Formats resource data into markdown context for the AI assistant.
 */

import type { ChatContext } from './chat-api';
import type { Task } from '@/hooks/useTasks';
import type { Plan } from '@/hooks/usePlans';
import type { Location } from '@/hooks/useLocations';
import type { Asset, Log } from './api';

/**
 * Build context for a Task
 */
export function buildTaskContext(task: Task, planName?: string): ChatContext {
  const lines: string[] = [
    `# Task: ${task.title}`,
    '',
    '## Metadata',
    `- **ID:** ${task.id}`,
    `- **State:** ${task.state}`,
    `- **Plan:** ${planName || task.planId || 'None'}`,
  ];

  if (task.targetDate) {
    lines.push(`- **Target Date:** ${task.targetDate}`);
  }

  if (task.estimateDisplay) {
    lines.push(`- **Estimate:** ${task.estimateDisplay}`);
  }

  if (task.cycleId) {
    lines.push(`- **Cycle ID:** ${task.cycleId}`);
  }

  if (task.parentId) {
    lines.push(`- **Parent Task ID:** ${task.parentId}`);
  }

  if (task.childCount && task.childCount > 0) {
    lines.push(`- **Subtasks:** ${task.childCount}`);
  }

  if (task.isBlocked) {
    lines.push(`- **Status:** BLOCKED`);
  }

  if (task.description) {
    lines.push('', '## Description', '', stripHtmlTags(task.description));
  }

  return {
    type: 'task',
    id: parseInt(task.id, 10),
    data: lines.join('\n'),
  };
}

/**
 * Build context for a Plan
 */
export function buildPlanContext(plan: Plan, tasks?: Task[]): ChatContext {
  const lines: string[] = [
    `# Plan: ${plan.name}`,
    '',
    '## Metadata',
    `- **ID:** ${plan.id}`,
    `- **Status:** ${plan.status}`,
  ];

  if (plan.startDate) {
    lines.push(`- **Start Date:** ${plan.startDate}`);
  }

  if (plan.targetDate) {
    lines.push(`- **Target Date:** ${plan.targetDate}`);
  }

  if (plan.taskCount !== undefined) {
    lines.push(`- **Total Tasks:** ${plan.taskCount}`);
  }

  if (plan.completedTaskCount !== undefined) {
    lines.push(`- **Completed Tasks:** ${plan.completedTaskCount}`);
  }

  if (plan.progressPercentage !== undefined) {
    lines.push(`- **Progress:** ${Math.round(plan.progressPercentage)}%`);
  }

  if (plan.description) {
    lines.push('', '## Description', '', plan.description);
  }

  // Include task list if provided
  if (tasks && tasks.length > 0) {
    lines.push('', '## Tasks', '');

    // Group by state
    const byState: Record<string, Task[]> = {};
    for (const task of tasks) {
      if (!byState[task.state]) byState[task.state] = [];
      byState[task.state].push(task);
    }

    const stateOrder = ['in_progress', 'todo', 'backlog', 'done', 'cancelled'];
    for (const state of stateOrder) {
      const stateTasks = byState[state];
      if (stateTasks && stateTasks.length > 0) {
        lines.push(`### ${formatState(state)} (${stateTasks.length})`);
        for (const task of stateTasks) {
          const date = task.targetDate ? ` - Due: ${task.targetDate}` : '';
          lines.push(`- [${task.state === 'done' ? 'x' : ' '}] ${task.title}${date}`);
        }
        lines.push('');
      }
    }
  }

  return {
    type: 'plan',
    id: parseInt(plan.id, 10),
    data: lines.join('\n'),
  };
}

/**
 * Strip HTML tags from a string (for descriptions)
 */
function stripHtmlTags(html: string): string {
  // Convert common HTML elements to markdown
  let text = html
    .replace(/<h1[^>]*>/gi, '# ')
    .replace(/<h2[^>]*>/gi, '## ')
    .replace(/<h3[^>]*>/gi, '### ')
    .replace(/<\/h[1-3]>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<ul[^>]*>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    .replace(/<strong[^>]*>/gi, '**')
    .replace(/<\/strong>/gi, '**')
    .replace(/<b[^>]*>/gi, '**')
    .replace(/<\/b>/gi, '**')
    .replace(/<em[^>]*>/gi, '*')
    .replace(/<\/em>/gi, '*')
    .replace(/<i[^>]*>/gi, '*')
    .replace(/<\/i>/gi, '*')
    .replace(/<hr[^>]*>/gi, '\n---\n')
    .replace(/<[^>]+>/g, '') // Remove remaining tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
    .trim();

  return text;
}

/**
 * Format task state for display
 */
function formatState(state: string): string {
  const labels: Record<string, string> = {
    backlog: 'Backlog',
    todo: 'To Do',
    in_progress: 'In Progress',
    done: 'Done',
    cancelled: 'Cancelled',
  };
  return labels[state] || state;
}

/**
 * Build context for an Asset
 */
export function buildAssetContext(asset: Asset, locationName?: string): ChatContext {
  const attrs = asset.attributes;
  const lines: string[] = [
    `# Asset: ${attrs.name}`,
    '',
    '## Metadata',
    `- **ID:** ${asset.id}`,
    `- **Type:** ${formatAssetType(attrs.asset_type)}`,
    `- **Status:** ${attrs.status}`,
  ];

  if (attrs.quantity && attrs.quantity > 1) {
    lines.push(`- **Quantity:** ${attrs.quantity}`);
  }

  if (locationName || attrs.current_location_id) {
    lines.push(`- **Current Location:** ${locationName || `ID: ${attrs.current_location_id}`}`);
  }

  if (attrs.parent_id) {
    if (attrs.parent_summary) {
      lines.push(`- **Parent:** ${attrs.parent_summary.name} (${formatAssetType(attrs.parent_summary.asset_type)})`);
    } else {
      lines.push(`- **Parent ID:** ${attrs.parent_id}`);
    }
  }

  if (attrs.child_count && attrs.child_count > 0) {
    lines.push(`- **Children:** ${attrs.child_count}`);
    if (attrs.children_summaries && attrs.children_summaries.length > 0) {
      for (const child of attrs.children_summaries.slice(0, 5)) {
        lines.push(`  - ${child.name} (${formatAssetType(child.asset_type)})`);
      }
      if (attrs.children_summaries.length > 5) {
        lines.push(`  - ... and ${attrs.children_summaries.length - 5} more`);
      }
    }
  }

  if (attrs.log_count && attrs.log_count > 0) {
    lines.push(`- **Associated Logs:** ${attrs.log_count}`);
  }

  if (attrs.movement_count && attrs.movement_count > 0) {
    lines.push(`- **Movement Records:** ${attrs.movement_count}`);
  }

  if (attrs.referencing_task_count && attrs.referencing_task_count > 0) {
    lines.push(`- **Referenced in Tasks:** ${attrs.referencing_task_count}`);
  }

  if (attrs.notes) {
    lines.push('', '## Notes', '', stripHtmlTags(attrs.notes));
  }

  // Include recent movements if available
  if (attrs.recent_movements && attrs.recent_movements.length > 0) {
    lines.push('', '## Recent Movements', '');
    for (const movement of attrs.recent_movements.slice(0, 5)) {
      const date = new Date(movement.timestamp).toLocaleDateString();
      lines.push(`- ${date}: ${movement.name} (${movement.status})`);
    }
  }

  // Include recent logs if available
  if (attrs.recent_logs && attrs.recent_logs.length > 0) {
    lines.push('', '## Recent Activity', '');
    for (const log of attrs.recent_logs.slice(0, 5)) {
      const date = new Date(log.timestamp).toLocaleDateString();
      lines.push(`- ${date}: ${log.name} (${formatLogType(log.log_type)})`);
    }
  }

  return {
    type: 'asset',
    id: parseInt(asset.id, 10),
    data: lines.join('\n'),
  };
}

/**
 * Build context for a Location
 */
export function buildLocationContext(location: Location, assets?: Asset[]): ChatContext {
  const lines: string[] = [
    `# Location: ${location.name}`,
    '',
    '## Metadata',
    `- **ID:** ${location.id}`,
    `- **Type:** ${location.location_type === 'polygon' ? 'Area (Polygon)' : 'Point'}`,
  ];

  if (location.status) {
    lines.push(`- **Status:** ${location.status}`);
  }

  if (location.area_acres) {
    lines.push(`- **Area:** ${location.area_acres.toFixed(2)} acres`);
  }

  if (location.parent_id) {
    lines.push(`- **Parent Location ID:** ${location.parent_id}`);
  }

  if (location.child_count && location.child_count > 0) {
    lines.push(`- **Child Locations:** ${location.child_count}`);
  }

  if (location.asset_count !== undefined) {
    lines.push(`- **Assets at this location:** ${location.asset_count}`);
  }

  if (location.total_asset_count !== undefined && location.total_asset_count !== location.asset_count) {
    lines.push(`- **Total assets (including children):** ${location.total_asset_count}`);
  }

  if (location.center_point) {
    lines.push(`- **Coordinates:** ${location.center_point.latitude.toFixed(6)}, ${location.center_point.longitude.toFixed(6)}`);
  }

  if (location.description) {
    lines.push('', '## Description', '', stripHtmlTags(location.description));
  }

  // Include assets at this location if provided
  if (assets && assets.length > 0) {
    lines.push('', '## Assets at this Location', '');

    // Group assets by type
    const byType: Record<string, Asset[]> = {};
    for (const asset of assets) {
      const type = asset.attributes.asset_type;
      if (!byType[type]) byType[type] = [];
      byType[type].push(asset);
    }

    for (const [type, typeAssets] of Object.entries(byType)) {
      lines.push(`### ${formatAssetType(type)} (${typeAssets.length})`);
      for (const asset of typeAssets.slice(0, 10)) {
        const qty = asset.attributes.quantity && asset.attributes.quantity > 1
          ? ` (qty: ${asset.attributes.quantity})`
          : '';
        lines.push(`- ${asset.attributes.name}${qty}`);
      }
      if (typeAssets.length > 10) {
        lines.push(`- ... and ${typeAssets.length - 10} more`);
      }
      lines.push('');
    }
  }

  return {
    type: 'location',
    id: parseInt(location.id, 10),
    data: lines.join('\n'),
  };
}

/**
 * Build context for a Log
 */
export function buildLogContext(log: Log): ChatContext {
  const attrs = log.attributes;
  const lines: string[] = [
    `# Log: ${attrs.name}`,
    '',
    '## Metadata',
    `- **ID:** ${log.id}`,
    `- **Type:** ${formatLogType(attrs.log_type)}`,
    `- **Status:** ${attrs.status}`,
    `- **Timestamp:** ${new Date(attrs.timestamp).toLocaleString()}`,
  ];

  if (attrs.is_movement) {
    lines.push(`- **Movement Log:** Yes`);
    if (attrs.from_location_id) {
      lines.push(`- **From Location ID:** ${attrs.from_location_id}`);
    }
    if (attrs.to_location_id) {
      lines.push(`- **To Location ID:** ${attrs.to_location_id}`);
    }
  }

  if (attrs.asset_count && attrs.asset_count > 0) {
    lines.push(`- **Associated Assets:** ${attrs.asset_count}`);
    if (attrs.asset_details && attrs.asset_details.length > 0) {
      for (const asset of attrs.asset_details.slice(0, 5)) {
        lines.push(`  - ${asset.name} (${formatAssetType(asset.asset_type)})`);
      }
      if (attrs.asset_details.length > 5) {
        lines.push(`  - ... and ${attrs.asset_details.length - 5} more`);
      }
    }
  }

  if (attrs.referencing_task_count && attrs.referencing_task_count > 0) {
    lines.push(`- **Referenced in Tasks:** ${attrs.referencing_task_count}`);
  }

  if (attrs.notes) {
    lines.push('', '## Notes', '', stripHtmlTags(attrs.notes));
  }

  return {
    type: 'log',
    id: parseInt(log.id, 10),
    data: lines.join('\n'),
  };
}

/**
 * Format asset type for display
 */
function formatAssetType(type: string): string {
  const labels: Record<string, string> = {
    animal: 'Animal',
    plant: 'Plant',
    equipment: 'Equipment',
    structure: 'Structure',
    land: 'Land',
    material: 'Material',
    compost: 'Compost',
  };
  return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Format log type for display
 */
function formatLogType(type: string): string {
  const labels: Record<string, string> = {
    activity: 'Activity',
    harvest: 'Harvest',
    input: 'Input',
    maintenance: 'Maintenance',
    observation: 'Observation',
    movement: 'Movement',
  };
  return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Generate example questions for a Task
 */
export function getTaskExampleQuestions(task: Task): string[] {
  const questions: string[] = [];

  if (task.state === 'backlog' || task.state === 'todo') {
    questions.push('What do I need to get started on this task?');
  }

  if (task.state === 'in_progress') {
    questions.push("What's the best way to complete this task?");
  }

  if (task.description) {
    questions.push('Can you summarize the key steps in this task?');
  }

  questions.push('What resources or materials might I need?');

  if (task.targetDate) {
    questions.push('Am I on track to complete this by the target date?');
  }

  return questions.slice(0, 4);
}

/**
 * Generate example questions for a Plan
 */
export function getPlanExampleQuestions(plan: Plan, tasks?: Task[]): string[] {
  const questions: string[] = [];

  // Progress-related questions
  if (plan.progressPercentage !== undefined && plan.progressPercentage < 100) {
    questions.push("What's the current status of this plan?");
  }

  // Task-related questions
  if (tasks && tasks.length > 0) {
    const inProgress = tasks.filter(t => t.state === 'in_progress');
    const todo = tasks.filter(t => t.state === 'todo');

    if (inProgress.length > 0) {
      questions.push('What tasks are currently in progress?');
    }
    if (todo.length > 0) {
      questions.push('What should I work on next?');
    }
  }

  questions.push('What are the key milestones in this plan?');
  questions.push('Are there any blockers or risks I should know about?');

  if (plan.targetDate) {
    questions.push('Am I on track to meet the target date?');
  }

  return questions.slice(0, 4);
}

/**
 * Generate example questions for an Asset
 */
export function getAssetExampleQuestions(asset: Asset): string[] {
  const questions: string[] = [];
  const attrs = asset.attributes;

  // Type-specific questions
  if (attrs.asset_type === 'animal') {
    questions.push('What is the health status of this animal?');
    questions.push('When was the last time this animal was moved?');
    if (attrs.quantity && attrs.quantity > 1) {
      questions.push(`How is this flock/herd of ${attrs.quantity} doing?`);
    }
  } else if (attrs.asset_type === 'plant') {
    questions.push('What care does this plant need right now?');
    questions.push('When should I harvest?');
  } else if (attrs.asset_type === 'equipment') {
    questions.push('When was this equipment last maintained?');
    questions.push('Is any maintenance due soon?');
  }

  // Location questions
  if (attrs.current_location_id) {
    questions.push('Where is this asset currently located?');
  }

  // Activity questions
  if (attrs.log_count && attrs.log_count > 0) {
    questions.push('What recent activity has been recorded?');
  }

  questions.push('What tasks involve this asset?');

  return questions.slice(0, 4);
}

/**
 * Generate example questions for a Location
 */
export function getLocationExampleQuestions(location: Location): string[] {
  const questions: string[] = [];

  // Asset questions
  if (location.asset_count && location.asset_count > 0) {
    questions.push('What assets are at this location?');
  }

  if (location.total_asset_count && location.total_asset_count !== location.asset_count) {
    questions.push('Show me all assets including child locations');
  }

  // Child location questions
  if (location.child_count && location.child_count > 0) {
    questions.push('What sub-locations are in this area?');
  }

  questions.push('What activities have happened here recently?');
  questions.push('What tasks are associated with this location?');

  if (location.area_acres) {
    questions.push('What is this area being used for?');
  }

  return questions.slice(0, 4);
}

/**
 * Generate example questions for a Log
 */
export function getLogExampleQuestions(log: Log): string[] {
  const questions: string[] = [];
  const attrs = log.attributes;

  // Type-specific questions
  if (attrs.log_type === 'harvest') {
    questions.push('What was the yield from this harvest?');
    questions.push('How does this compare to previous harvests?');
  } else if (attrs.log_type === 'observation') {
    questions.push('What was observed and any follow-up needed?');
  } else if (attrs.log_type === 'movement') {
    questions.push('Where did the asset move from and to?');
  } else if (attrs.log_type === 'input') {
    questions.push('What inputs were applied and in what amounts?');
  } else if (attrs.log_type === 'maintenance') {
    questions.push('What maintenance was performed?');
    questions.push('When is the next maintenance due?');
  }

  // Asset questions
  if (attrs.asset_count && attrs.asset_count > 0) {
    questions.push('What assets were involved in this log?');
  }

  questions.push('Are there any related logs or follow-up actions?');

  return questions.slice(0, 4);
}

/**
 * Generate a brief summary for a Plan
 */
export function getPlanSummary(plan: Plan, tasks?: Task[]): string {
  const parts: string[] = [];

  parts.push(`**${plan.name}** is currently *${plan.status}*.`);

  if (plan.progressPercentage !== undefined) {
    parts.push(`Progress: ${Math.round(plan.progressPercentage)}% complete.`);
  }

  if (plan.taskCount !== undefined) {
    const completed = plan.completedTaskCount || 0;
    parts.push(`${completed} of ${plan.taskCount} tasks done.`);
  }

  if (tasks && tasks.length > 0) {
    const inProgress = tasks.filter(t => t.state === 'in_progress');
    const todo = tasks.filter(t => t.state === 'todo');

    if (inProgress.length > 0) {
      parts.push(`${inProgress.length} task${inProgress.length > 1 ? 's' : ''} in progress.`);
    }
    if (todo.length > 0) {
      parts.push(`${todo.length} task${todo.length > 1 ? 's' : ''} ready to start.`);
    }
  }

  if (plan.targetDate) {
    const target = new Date(plan.targetDate);
    const now = new Date();
    const daysLeft = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 0) {
      parts.push(`Target: ${target.toLocaleDateString()} (${daysLeft} days remaining).`);
    } else if (daysLeft === 0) {
      parts.push(`Target: Today!`);
    } else {
      parts.push(`Target: ${target.toLocaleDateString()} (${Math.abs(daysLeft)} days overdue).`);
    }
  }

  return parts.join(' ');
}

/**
 * Generate a brief summary for a Task
 */
export function getTaskSummary(task: Task): string {
  const parts: string[] = [];

  parts.push(`**${task.title}** is *${formatState(task.state)}*.`);

  if (task.estimateDisplay) {
    parts.push(`Estimated: ${task.estimateDisplay}.`);
  }

  if (task.targetDate) {
    const target = new Date(task.targetDate);
    const now = new Date();
    const daysLeft = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 0) {
      parts.push(`Due: ${target.toLocaleDateString()} (${daysLeft} days).`);
    } else if (daysLeft === 0) {
      parts.push(`Due: Today!`);
    } else {
      parts.push(`Overdue by ${Math.abs(daysLeft)} days.`);
    }
  }

  if (task.isBlocked) {
    parts.push(`**Blocked** - waiting on dependencies.`);
  }

  if (task.childCount && task.childCount > 0) {
    parts.push(`Has ${task.childCount} subtask${task.childCount > 1 ? 's' : ''}.`);
  }

  return parts.join(' ');
}

/**
 * Generate a brief summary for an Asset
 */
export function getAssetSummary(asset: Asset): string {
  const attrs = asset.attributes;
  const parts: string[] = [];

  const typeName = formatAssetType(attrs.asset_type);
  if (attrs.quantity && attrs.quantity > 1) {
    parts.push(`**${attrs.name}** is a ${typeName.toLowerCase()} with quantity ${attrs.quantity}.`);
  } else {
    parts.push(`**${attrs.name}** is a ${typeName.toLowerCase()}.`);
  }

  parts.push(`Status: *${attrs.status}*.`);

  if (attrs.log_count && attrs.log_count > 0) {
    parts.push(`${attrs.log_count} log${attrs.log_count > 1 ? 's' : ''} recorded.`);
  }

  if (attrs.movement_count && attrs.movement_count > 0) {
    parts.push(`${attrs.movement_count} movement${attrs.movement_count > 1 ? 's' : ''} tracked.`);
  }

  return parts.join(' ');
}

/**
 * Generate a brief summary for a Location
 */
export function getLocationSummary(location: Location): string {
  const parts: string[] = [];

  const typeName = location.location_type === 'polygon' ? 'area' : 'point';
  parts.push(`**${location.name}** is a ${typeName}.`);

  if (location.area_acres) {
    parts.push(`Size: ${location.area_acres.toFixed(2)} acres.`);
  }

  if (location.asset_count !== undefined && location.asset_count > 0) {
    parts.push(`${location.asset_count} asset${location.asset_count > 1 ? 's' : ''} here.`);
  }

  if (location.total_asset_count !== undefined && location.total_asset_count !== location.asset_count && location.total_asset_count > 0) {
    parts.push(`${location.total_asset_count} total including sub-locations.`);
  }

  if (location.child_count && location.child_count > 0) {
    parts.push(`Contains ${location.child_count} sub-location${location.child_count > 1 ? 's' : ''}.`);
  }

  return parts.join(' ');
}

/**
 * Generate a brief summary for a Log
 */
export function getLogSummary(log: Log): string {
  const attrs = log.attributes;
  const parts: string[] = [];

  const typeName = formatLogType(attrs.log_type);
  const date = new Date(attrs.timestamp).toLocaleDateString();
  parts.push(`**${attrs.name}** - ${typeName} log from ${date}.`);

  parts.push(`Status: *${attrs.status}*.`);

  if (attrs.asset_count && attrs.asset_count > 0) {
    parts.push(`Involves ${attrs.asset_count} asset${attrs.asset_count > 1 ? 's' : ''}.`);
  }

  if (attrs.is_movement) {
    parts.push(`This is a movement record.`);
  }

  return parts.join(' ');
}
