import React from 'react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { MousePointer, Pentagon, Menu, X, Mountain, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MapToolbarProps {
  drawMode: 'polygon' | 'select';
  onDrawModeChange: (mode: 'polygon' | 'select') => void;
  onSidebarToggle: () => void;
  sidebarOpen: boolean;
  mapStyle: 'outdoors' | 'terrain';
  onMapStyleChange: (style: 'outdoors' | 'terrain') => void;
}

export const MapToolbar: React.FC<MapToolbarProps> = ({
  drawMode,
  onDrawModeChange,
  onSidebarToggle,
  sidebarOpen,
  mapStyle,
  onMapStyleChange,
}) => {
  return (
    <div className="absolute top-4 left-4 z-10 flex gap-2">
      {/* Sidebar Toggle */}
      <Button
        variant="secondary"
        size="sm"
        onClick={onSidebarToggle}
        className="bg-map-toolbar border shadow-toolbar hover:bg-accent"
      >
        {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* Drawing Tools */}
      <div className="flex bg-map-toolbar border rounded-md shadow-toolbar overflow-hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            console.log('[MapToolbar] Select button clicked');
            onDrawModeChange('select');
          }}
          className={cn(
            "rounded-none border-r border-border/50 hover:bg-accent",
            drawMode === 'select' && "bg-primary text-primary-foreground hover:bg-primary"
          )}
        >
          <MousePointer className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            console.log('[MapToolbar] Polygon button clicked');
            onDrawModeChange('polygon');
          }}
          className={cn(
            "rounded-none hover:bg-accent",
            drawMode === 'polygon' && "bg-draw-polygon text-white hover:bg-draw-polygon"
          )}
        >
          <Pentagon className="h-4 w-4" />
        </Button>
      </div>

      {/* Map Style Switcher */}
      <ToggleGroup
        type="single"
        value={mapStyle}
        onValueChange={(value) => value && onMapStyleChange(value as any)}
        className="bg-map-toolbar border rounded-md shadow-toolbar"
      >
        <ToggleGroupItem value="outdoors" size="sm" className="rounded-none border-r border-border/50">
          <Mountain className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="terrain" size="sm" className="rounded-none">
          <Globe className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};