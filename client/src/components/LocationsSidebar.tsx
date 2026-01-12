import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Pentagon, Trash2, Edit, Eye, Layers, List, Plus, Info } from 'lucide-react';
import { AddressSearch } from './AddressSearch';
import { cn } from '@/lib/utils';
import { Location } from '@/hooks/useLocations';
import { LazyHierarchyTreeView } from './HierarchyTreeView';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LocationEditModal } from './LocationEditModal';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

interface LocationsSidebarProps {
  locations: Location[];
  selectedLocation: Location | null;
  onLocationSelect: (location: Location) => void;
  onLocationDelete: (id: string) => void;
  onLocationUpdate: (id: string, updates: Partial<Location>) => void;
  onAddChildLocation?: (location: Location) => void;
  onAddressSelect: (address: any) => void;
  mapboxToken: string;
  isOpen: boolean;
  onToggle: () => void;
}

export const LocationsSidebar: React.FC<LocationsSidebarProps> = ({
  locations,
  selectedLocation,
  onLocationSelect,
  onLocationDelete,
  onLocationUpdate,
  onAddChildLocation,
  onAddressSelect,
  mapboxToken,
  isOpen
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('tree');

  // Edit modal state
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Delete confirmation state
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const openEditModal = (location: Location) => {
    setEditingLocation(location);
    setIsEditModalOpen(true);
  };

  const handleEditSave = (id: string, updates: Partial<Location>) => {
    onLocationUpdate(id, updates);
    setIsEditModalOpen(false);
    setEditingLocation(null);
  };

  const openDeleteDialog = (location: Location) => {
    setDeletingLocation(location);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deletingLocation) {
      onLocationDelete(deletingLocation.id);
      setDeletingLocation(null);
    }
  };

  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Organize locations into hierarchy
  const { rootLocations, hasHierarchy } = useMemo(() => {
    const roots = filteredLocations.filter(loc => !loc.parent_id || loc.is_root);
    const hasHierarchy = filteredLocations.some(loc => loc.parent_id || (loc.child_count && loc.child_count > 0));
    return { rootLocations: roots, hasHierarchy };
  }, [filteredLocations]);

  // Build location tree for display
  const buildLocationTree = (parentId: number | null = null): Location[] => {
    return filteredLocations
      .filter(loc => loc.parent_id === parentId || (!parentId && !loc.parent_id))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const loadChildren = async (nodeId: string): Promise<Location[]> => {
    return buildLocationTree(Number(nodeId));
  };

  if (!isOpen) return null;

  return (
    <div className="w-96 bg-map-sidebar border-r border-border h-full flex flex-col shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-map-sidebar-foreground mb-3">Locations</h2>
        
        {/* Address Search */}
        <div className="mb-3">
          <AddressSearch
            mapboxToken={mapboxToken}
            onAddressSelect={onAddressSelect}
          />
        </div>
        
        {/* Location Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search saved locations..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 bg-background"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 border-b border-border bg-accent/30">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-accent-foreground">
              {locations.length}
            </div>
            <div className="text-xs text-muted-foreground">Locations</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-accent-foreground">
              {locations
                .reduce((sum, loc) => sum + (loc.area_acres || 0), 0)
                .toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">Total Acres</div>
          </div>
        </div>
      </div>

      {/* Info Tip */}
      {locations.length > 0 && (
        <div className="px-4 pt-3">
          <Alert className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-xs text-blue-800 dark:text-blue-300 ml-2">
              Click the blue asset count circles on the map to see details
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* View Mode Toggle */}
      {hasHierarchy && (
        <div className="px-4 pt-4 pb-2 border-b border-border">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'tree')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tree" className="text-xs">
                <Layers className="h-3 w-3 mr-1" />
                Tree
              </TabsTrigger>
              <TabsTrigger value="list" className="text-xs">
                <List className="h-3 w-3 mr-1" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Locations List/Tree */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredLocations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'No locations found' : 'No locations yet. Start drawing on the map!'}
          </div>
        ) : viewMode === 'tree' && hasHierarchy ? (
          // Tree View
          <LazyHierarchyTreeView
            rootNodes={rootLocations}
            selectedId={selectedLocation?.id}
            onSelect={onLocationSelect}
            onLoadChildren={loadChildren}
            renderIcon={(location, isExpanded) => (
              <Pentagon className="h-4 w-4 text-draw-polygon" />
            )}
            renderLabel={(location) => (
              <div className="flex flex-col gap-0.5 flex-1 min-w-0 pr-2">
                <div className="font-medium truncate" title={location.name}>
                  {location.name}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {location.area_acres !== null && location.area_acres !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      {location.area_acres.toFixed(1)}ac
                    </span>
                  )}
                  {location.child_count !== undefined && location.child_count > 0 && (
                    <span className="text-xs text-muted-foreground">
                      • {location.child_count} {location.child_count === 1 ? 'child' : 'children'}
                    </span>
                  )}
                  {location.total_asset_count !== undefined && location.total_asset_count > 0 && (
                    <span className="text-xs text-muted-foreground">
                      • {location.total_asset_count} assets
                    </span>
                  )}
                </div>
              </div>
            )}
              renderActions={(location) => (
              <div className="flex items-center gap-0.5">
                {onAddChildLocation && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddChildLocation(location);
                          }}
                          className="h-7 w-7 p-0"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p>Add child location</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLocationSelect(location);
                        }}
                        className="h-7 w-7 p-0"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p>View on map</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(location);
                        }}
                        className="h-7 w-7 p-0"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p>Edit location</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteDialog(location);
                        }}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p>Delete</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          />
        ) : (
          // List View (original)
          <div className="space-y-2">
            {filteredLocations.map((location) => (
              <div
                key={location.id}
                className={cn(
                  "p-3 rounded-lg border bg-card transition-all cursor-pointer hover:shadow-md",
                  selectedLocation?.id === location.id && "ring-2 ring-primary shadow-md"
                )}
                onClick={() => onLocationSelect(location)}
              >
                {/* Location Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Pentagon className="h-4 w-4 text-draw-polygon" />
                    <span className="font-medium text-card-foreground">{location.name}</span>
                    {location.depth !== undefined && location.depth > 0 && (
                      <Badge variant="outline" className="text-xs">
                        L{location.depth}
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-1">
                    {onAddChildLocation && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddChildLocation(location);
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Add child location</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onLocationSelect(location);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(location);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(location);
                      }}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Location Details */}
                <div className="text-xs text-muted-foreground space-y-1">
                  {location.area_acres !== null && location.area_acres !== undefined && (
                    <div className="font-medium text-card-foreground">
                      {location.area_acres.toFixed(2)} acres
                    </div>
                  )}
                  {location.asset_count !== undefined && location.asset_count > 0 && (
                    <div className="text-primary">
                      {location.asset_count} asset{location.asset_count !== 1 ? 's' : ''}
                    </div>
                  )}
                  {location.total_asset_count !== undefined && location.total_asset_count > location.asset_count! && (
                    <div className="text-muted-foreground text-xs">
                      ({location.total_asset_count} total with children)
                    </div>
                  )}
                  <div>Created: {new Date(location.createdAt).toLocaleDateString()}</div>
                  {location.description && (
                    <div className="mt-2 text-card-foreground text-sm">{location.description}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <LocationEditModal
        location={editingLocation}
        locations={locations}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSave={handleEditSave}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Location"
        itemName={deletingLocation?.name}
      />
    </div>
  );
};