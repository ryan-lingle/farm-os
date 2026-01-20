import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Package,
  FileText,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  Map,
  Users,
  Sprout,
  Tractor,
  Building2,
  Recycle,
  ChevronRight,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLocation as useLocationData, useLocations, useChildLocations } from '@/hooks/useLocations';
import { useAssetsAtLocation } from '@/hooks/useAssets';
import { useLocationClimate, getCenterFromGeometry } from '@/hooks/useLocationClimate';
import { Skeleton } from '@/components/ui/skeleton';
import { BackReferences } from '@/components/BackReferences';
import { LocationDetailMap } from '@/components/LocationDetailMap';
import { ClimateSummaryCard } from '@/components/ClimateSummaryCard';
import { format } from 'date-fns';

// Asset type icons
const assetTypeIcons: Record<string, React.ElementType> = {
  animal: Users,
  plant: Sprout,
  equipment: Tractor,
  structure: Building2,
  compost: Recycle,
  material: Package,
};

export const LocationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // All hooks must be called before any early returns
  const { data: location, isLoading } = useLocationData(id || '');
  const { locations: allLocations } = useLocations();
  const { locations: childLocations, isLoading: childrenLoading } = useChildLocations(id || '');
  const { assets, isLoading: assetsLoading } = useAssetsAtLocation(id || '', allLocations);

  // Get center coordinates for climate data
  const center = location ? getCenterFromGeometry(location.geometry) : null;
  const { data: climate, isLoading: climateLoading, error: climateError } = useLocationClimate(
    center ? center[0] : null,
    center ? center[1] : null
  );

  if (!id) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Location not found</p>
        </div>
      </div>
    );
  }

  if (isLoading || !location) {
    return (
      <div className="p-6 space-y-6">
        <Button variant="ghost" disabled>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const attrs = location as any;
  const recentMovements = attrs.recent_movements || [];
  const incomingCount = attrs.incoming_movement_count || 0;
  const outgoingCount = attrs.outgoing_movement_count || 0;

  // Find parent location
  const parentLocation = location.parent_id
    ? allLocations.find((loc) => String(loc.id) === String(location.parent_id))
    : null;

  // Group assets by type
  const assetsByType = assets.reduce((acc: Record<string, any[]>, asset: any) => {
    const type = asset.type || 'unknown';
    if (!acc[type]) acc[type] = [];
    acc[type].push(asset);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm">
        <Button variant="ghost" size="sm" onClick={() => navigate('/locations')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Map
        </Button>
        {parentLocation && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Link
              to={`/locations/${parentLocation.id}`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {parentLocation.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{location.name}</span>
      </div>

      {/* Header with Title */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MapPin className="h-8 w-8 text-blue-600" />
            {location.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            {location.location_type === 'polygon' ? 'Area' : 'Point'}
            {location.area_acres ? ` • ${location.area_acres.toFixed(2)} acres` : ''}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/locations')}>
          <Map className="h-4 w-4 mr-2" />
          View on Map
        </Button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        {location.area_acres !== undefined && location.area_acres !== null && (
          <Badge variant="secondary" className="text-sm">
            {location.area_acres.toFixed(2)} acres
          </Badge>
        )}
        {location.asset_count !== undefined && location.asset_count > 0 && (
          <Badge variant="default" className="text-sm">
            {location.asset_count} asset{location.asset_count !== 1 ? 's' : ''}
          </Badge>
        )}
        {location.child_count !== undefined && location.child_count > 0 && (
          <Badge variant="outline" className="text-sm">
            {location.child_count} sub-location{location.child_count !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Interactive Map */}
      {location.geometry && (
        <LocationDetailMap location={location} />
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Location information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {location.description && (
              <div>
                <p className="text-muted-foreground text-sm">Description</p>
                <p className="mt-1">{location.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-sm">Type</p>
                <p className="font-medium mt-1 capitalize">{location.location_type}</p>
              </div>
              {location.area_acres !== undefined && location.area_acres !== null && (
                <div>
                  <p className="text-muted-foreground text-sm">Area</p>
                  <p className="font-medium mt-1">{location.area_acres.toFixed(2)} acres</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground text-sm">Created</p>
                <p className="font-medium mt-1">{new Date(location.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Last Updated</p>
                <p className="font-medium mt-1">{new Date(location.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metadata Sidebar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Package className="h-4 w-4" /> Assets Here
              </span>
              <span className="font-bold">{location.asset_count || 0}</span>
            </div>
            {location.total_asset_count !== undefined && location.total_asset_count > (location.asset_count || 0) && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total (with children)</span>
                <span className="font-bold">{location.total_asset_count}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <ArrowDownLeft className="h-4 w-4" /> Incoming Movements
              </span>
              <span className="font-bold">{incomingCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <ArrowUpRight className="h-4 w-4" /> Outgoing Movements
              </span>
              <span className="font-bold">{outgoingCount}</span>
            </div>

            {/* Back References */}
            {((attrs.referencing_task_count > 0 || attrs.referencing_plan_count > 0)) && (
              <div className="pt-4 border-t">
                <BackReferences
                  entityType="location"
                  referencingTaskCount={attrs.referencing_task_count}
                  referencingPlanCount={attrs.referencing_plan_count}
                  referencingTasks={(attrs.referencing_tasks || []).map((t: any) => ({
                    id: t.id,
                    name: t.title,
                    type: 'task' as const,
                    state: t.state,
                  }))}
                  referencingPlans={(attrs.referencing_plans || []).map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    type: 'plan' as const,
                    status: p.status,
                  }))}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Climate Data */}
      {center && (
        <ClimateSummaryCard
          climate={climate}
          isLoading={climateLoading}
          error={climateError as Error | null}
        />
      )}

      {/* Assets at this Location */}
      {(assets.length > 0 || assetsLoading) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Assets at this Location
            </CardTitle>
            <CardDescription>
              {assets.length} asset{assets.length !== 1 ? 's' : ''} currently here
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assetsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(assetsByType).map(([type, typeAssets]) => {
                  const Icon = assetTypeIcons[type] || Package;
                  return (
                    <div key={type}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium capitalize">{type}s</span>
                        <Badge variant="secondary" className="text-xs">
                          {typeAssets.length}
                        </Badge>
                      </div>
                      <div className="grid gap-2">
                        {typeAssets.map((asset: any) => (
                          <Link
                            key={asset.id}
                            to={`/records/assets/${type}/${asset.id}`}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span className="font-medium">{asset.attributes?.name || 'Unnamed'}</span>
                              {asset.attributes?.quantity && (
                                <Badge variant="outline" className="text-xs">
                                  {asset.attributes.quantity}
                                </Badge>
                              )}
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Child Locations */}
      {(childLocations.length > 0 || childrenLoading) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Sub-Locations
            </CardTitle>
            <CardDescription>
              {childLocations.length} location{childLocations.length !== 1 ? 's' : ''} within {location.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {childrenLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="grid gap-2">
                {childLocations.map((childLoc) => (
                  <Link
                    key={childLoc.id}
                    to={`/locations/${childLoc.id}`}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{childLoc.name}</span>
                      {childLoc.asset_count !== undefined && childLoc.asset_count > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {childLoc.asset_count} asset{childLoc.asset_count !== 1 ? 's' : ''}
                        </Badge>
                      )}
                      {childLoc.area_acres && (
                        <span className="text-xs text-muted-foreground">
                          {childLoc.area_acres.toFixed(2)} ac
                        </span>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Movement History */}
      {recentMovements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Movement History
            </CardTitle>
            <CardDescription>
              Recent asset movements to and from this location
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentMovements.map((movement: any) => (
                <div
                  key={movement.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {movement.direction === 'incoming' ? (
                        <ArrowDownLeft className="h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-orange-600" />
                      )}
                      <span className="font-medium">{movement.name}</span>
                      <Badge variant={movement.direction === 'incoming' ? 'default' : 'secondary'} className="text-xs">
                        {movement.direction}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3" />
                      {movement.timestamp ? format(new Date(movement.timestamp), 'MMM d, yyyy h:mm a') : 'Unknown date'}
                    </div>
                  </div>
                </div>
              ))}
              {(incomingCount + outgoingCount) > 10 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Showing 10 most recent of {incomingCount + outgoingCount} movements
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LocationDetail;
