// Entity type icons and colors for the mention system
// Maps entity types to Lucide icons and Tailwind color classes

import {
  Bug,
  Leaf,
  Tractor,
  Building2,
  Package,
  MapPin,
  CheckSquare,
  FolderKanban,
  FileText,
  LucideIcon,
  Map,
  Box,
} from 'lucide-react';
import type { EntityType } from './api';

// Icon mapping for entity types
export const entityIcons: Record<string, LucideIcon> = {
  // Asset types
  asset: Box,
  animal: Bug,
  plant: Leaf,
  equipment: Tractor,
  structure: Building2,
  material: Package,
  land: Map,
  // Other entity types
  location: MapPin,
  task: CheckSquare,
  plan: FolderKanban,
  log: FileText,
};

// Color classes for entity types (background + text)
export const entityColors: Record<string, { bg: string; text: string; border: string }> = {
  // Asset types (amber/orange family)
  asset: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  animal: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  plant: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  equipment: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  structure: { bg: 'bg-stone-50', text: 'text-stone-700', border: 'border-stone-200' },
  material: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  land: { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200' },
  // Other entity types
  location: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  task: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  plan: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  log: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
};

// Get icon for an entity type (with fallback for asset subtypes)
export function getEntityIcon(type: string, assetType?: string): LucideIcon {
  // For assets, prefer the asset subtype icon
  if (type === 'asset' && assetType && entityIcons[assetType]) {
    return entityIcons[assetType];
  }
  return entityIcons[type] || Box;
}

// Get colors for an entity type (with fallback for asset subtypes)
export function getEntityColors(type: string, assetType?: string) {
  // For assets, prefer the asset subtype colors
  if (type === 'asset' && assetType && entityColors[assetType]) {
    return entityColors[assetType];
  }
  return entityColors[type] || entityColors.asset;
}

// Entity type display names
export const entityTypeNames: Record<EntityType, string> = {
  asset: 'Asset',
  location: 'Location',
  task: 'Task',
  plan: 'Plan',
  log: 'Log',
};

// Slash command triggers for each entity type
export const slashCommands: { type: EntityType; command: string; label: string; description: string }[] = [
  { type: 'asset', command: 'asset', label: 'Asset', description: 'Reference an asset (animal, plant, equipment...)' },
  { type: 'location', command: 'location', label: 'Location', description: 'Reference a farm location' },
  { type: 'task', command: 'task', label: 'Task', description: 'Reference a task' },
  { type: 'plan', command: 'plan', label: 'Plan', description: 'Reference a plan/project' },
  { type: 'log', command: 'log', label: 'Log', description: 'Reference an activity log' },
];
