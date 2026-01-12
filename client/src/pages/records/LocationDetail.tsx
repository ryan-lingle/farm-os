import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Package, FileText, Calendar, ArrowDownLeft, ArrowUpRight, ExternalLink, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLocation as useLocationData } from '@/hooks/useLocations';
import { useAssetsAtLocation } from '@/hooks/useAssets';
import { Skeleton } from '@/components/ui/skeleton';
import { BackReferences } from '@/components/BackReferences';
import { format } from 'date-fns';

export const LocationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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

  const { data: location, isLoading } = useLocationData(id);

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

  return (
    <div className="p-6 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/locations')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Map
      </Button>

      {/* Header with Title */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MapPin className="h-8 w-8 text-blue-600" />
            {location.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            {location.location_type === 'polygon' ? 'Polygon' : 'Point'} • ID: {location.id}
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
