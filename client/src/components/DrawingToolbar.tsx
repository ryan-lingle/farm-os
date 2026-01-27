/**
 * Drawing toolbar component for Terra Draw.
 * Provides mode selection and feature management controls.
 */

import { Pentagon, Minus, Circle, CircleDot, MousePointer, Trash2 } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { DrawingMode } from '@/hooks/useTerraDraw';

interface DrawingToolbarProps {
  mode: DrawingMode;
  featureCount: number;
  onModeChange: (mode: DrawingMode) => void;
  onClear: () => void;
  disabled?: boolean;
}

const MODE_ICONS: Record<DrawingMode, typeof Pentagon> = {
  polygon: Pentagon,
  linestring: Minus,
  point: CircleDot,
  circle: Circle,
  select: MousePointer,
  static: MousePointer,
};

const MODE_LABELS: Record<DrawingMode, string> = {
  polygon: 'Draw Polygon',
  linestring: 'Draw Line',
  point: 'Draw Point',
  circle: 'Draw Circle (Pond)',
  select: 'Select & Edit',
  static: 'View Only',
};

const MODE_SHORTCUTS: Record<DrawingMode, string> = {
  polygon: 'P',
  linestring: 'L',
  point: 'O',
  circle: 'C',
  select: 'S',
  static: 'Esc',
};

export function DrawingToolbar({
  mode,
  featureCount,
  onModeChange,
  onClear,
  disabled = false,
}: DrawingToolbarProps) {
  // Filter out 'static' from toggle options - it's the default/escape mode
  const drawingModes: DrawingMode[] = ['select', 'polygon', 'circle', 'linestring', 'point'];

  const handleValueChange = (value: string) => {
    if (value && value !== mode) {
      onModeChange(value as DrawingMode);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-2 p-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 border rounded-lg shadow-lg">
        <ToggleGroup
          type="single"
          value={mode === 'static' ? '' : mode}
          onValueChange={handleValueChange}
          disabled={disabled}
          className="gap-0.5"
        >
          {drawingModes.map((m) => {
            const Icon = MODE_ICONS[m];
            const isActive = mode === m;

            return (
              <Tooltip key={m}>
                <TooltipTrigger asChild>
                  <ToggleGroupItem
                    value={m}
                    aria-label={MODE_LABELS[m]}
                    className={`h-8 w-8 p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground ${
                      isActive ? 'ring-2 ring-primary ring-offset-1' : ''
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p>{MODE_LABELS[m]}</p>
                  <p className="text-muted-foreground">Press {MODE_SHORTCUTS[m]}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </ToggleGroup>

        <Separator orientation="vertical" className="h-6" />

        {/* Feature count badge */}
        {featureCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {featureCount} drawn
          </Badge>
        )}

        {/* Clear button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClear}
              disabled={disabled || featureCount === 0}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p>Clear all features</p>
            <p className="text-muted-foreground">Press ⌘+Delete</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

/**
 * Hook for keyboard shortcuts.
 * Call this in the parent component to enable shortcuts.
 */
export function useDrawingShortcuts(
  onModeChange: (mode: DrawingMode) => void,
  onClear: () => void,
  enabled: boolean = true,
  onDeleteSelected?: () => void
) {
  if (typeof window === 'undefined') return;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in inputs
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'p':
        onModeChange('polygon');
        break;
      case 'l':
        onModeChange('linestring');
        break;
      case 'o':
        onModeChange('point');
        break;
      case 'c':
        onModeChange('circle');
        break;
      case 's':
        onModeChange('select');
        break;
      case 'escape':
        onModeChange('static');
        break;
      case 'delete':
      case 'backspace':
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          // Ctrl/Cmd+Delete clears all features
          onClear();
        } else if (onDeleteSelected) {
          // Plain Delete removes selected feature
          onDeleteSelected();
        }
        break;
    }
  };

  // Add event listener
  window.addEventListener('keydown', handleKeyDown);

  // Return cleanup function
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}
