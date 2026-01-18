import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Archive,
  MapPin,
  FileText,
  Calendar,
  ExternalLink,
  ChevronRight,
  FolderOpen,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  Users,
  Sprout,
  Tractor,
  Building2,
  Recycle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAsset, useUpdateAsset, useDeleteAsset } from '@/hooks/useAssets';
import { useLocations } from '@/hooks/useLocations';
import { Asset } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { BackReferences } from '@/components/BackReferences';
import { AssetLogsSection } from '@/components/AssetLogsSection';
import { toast } from 'sonner';
import { showError } from '@/components/ErrorToast';
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

export const AssetDetail: React.FC = () => {
  const { assetType, id } = useParams<{ assetType: string; id: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  if (!assetType || !id) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Asset not found</p>
        </div>
      </div>
    );
  }

  // Use single asset fetch hook
  const { data, isLoading } = useAsset(assetType, id);
  const { locations } = useLocations();
  const updateAsset = useUpdateAsset(assetType);
  const deleteAsset = useDeleteAsset(assetType);

  const asset = data?.data;

  const [editFormData, setEditFormData] = useState({
    name: asset?.attributes.name || '',
    quantity: asset?.attributes.quantity?.toString() || '',
    notes: asset?.attributes.notes || '',
    status: asset?.attributes.status || 'active',
    current_location_id: asset?.attributes.current_location_id?.toString() || '',
  });

  React.useEffect(() => {
    if (asset) {
      setEditFormData({
        name: asset.attributes.name,
        quantity: asset.attributes.quantity?.toString() || '',
        notes: asset.attributes.notes || '',
        status: asset.attributes.status,
        current_location_id: asset.attributes.current_location_id?.toString() || '',
      });
    }
  }, [asset]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset) return;
    try {
      await updateAsset.mutateAsync({
        id: asset.id,
        data: {
          name: editFormData.name,
          quantity: editFormData.quantity ? parseFloat(editFormData.quantity) : undefined,
          status: editFormData.status,
          notes: editFormData.notes,
          current_location_id: editFormData.current_location_id ? Number(editFormData.current_location_id) : null,
        }
      });
      setIsEditing(false);
      toast.success('Asset updated successfully');
    } catch (error) {
      showError(error, 'Failed to update asset');
    }
  };

  const handleDelete = async () => {
    if (!asset) return;
    try {
      await deleteAsset.mutateAsync(asset.id);
      toast.success('Asset archived successfully');
      navigate(`/records/assets/${assetType}`);
    } catch (error) {
      showError(error, 'Failed to archive asset');
    }
  };

  if (isLoading || !asset) {
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

  const attrs = asset.attributes as any;
  const assetTypeTitle = assetType.charAt(0).toUpperCase() + assetType.slice(1);
  const currentLocation = locations.find(loc => Number(loc.id) === asset.attributes.current_location_id);
  const parentSummary = attrs.parent_summary;
  const childrenSummaries = attrs.children_summaries || [];
  const recentMovements = attrs.recent_movements || [];
  const movementCount = attrs.movement_count || 0;
  const AssetIcon = assetTypeIcons[assetType] || Package;

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/records/assets/${assetType}`)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {assetTypeTitle}s
        </Button>
        {parentSummary && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Link
              to={`/records/assets/${parentSummary.asset_type}/${parentSummary.id}`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {parentSummary.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{asset.attributes.name}</span>
      </div>

      {/* Header with Title and Actions */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AssetIcon className="h-8 w-8 text-primary" />
            {asset.attributes.name}
          </h1>
          <p className="text-muted-foreground mt-1">{assetTypeTitle} • ID: {asset.id}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={isEditing ? 'destructive' : 'outline'}
            onClick={() => setIsEditing(!isEditing)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archive Asset</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to archive "{asset.attributes.name}"? The asset will be hidden from lists but can be restored later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Archive
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Status and Metadata Badges */}
      <div className="flex flex-wrap gap-3">
        <Badge variant={asset.attributes.status === 'active' ? 'default' : 'secondary'}>
          {asset.attributes.status === 'archived' ? 'Archived' : asset.attributes.status}
        </Badge>
        {currentLocation && (
          <Link to={`/locations/${currentLocation.id}`}>
            <Badge variant="outline" className="flex items-center gap-1 cursor-pointer hover:bg-accent transition-colors">
              <MapPin className="h-3 w-3" />
              {currentLocation.name}
              <ExternalLink className="h-3 w-3 ml-1 opacity-50" />
            </Badge>
          </Link>
        )}
        {asset.attributes.quantity && (
          <Badge variant="secondary">
            Qty: {asset.attributes.quantity}
          </Badge>
        )}
        {(attrs.child_count ?? 0) > 0 && (
          <Badge variant="outline">
            {attrs.child_count} sub-asset{attrs.child_count !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Asset information and settings</CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    placeholder="Asset name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    value={editFormData.quantity}
                    onChange={(e) => setEditFormData({ ...editFormData, quantity: e.target.value })}
                    placeholder="e.g., 10"
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={editFormData.status} onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="location">Current Location</Label>
                  <Select value={editFormData.current_location_id?.toString() || 'none'} onValueChange={(value) => setEditFormData({ ...editFormData, current_location_id: value === 'none' ? '' : value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    placeholder="Additional details..."
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateAsset.isPending}>
                    {updateAsset.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="text-sm mt-1">{asset.attributes.name}</p>
                </div>

                {asset.attributes.quantity && (
                  <div>
                    <Label className="text-muted-foreground">Quantity</Label>
                    <p className="text-sm mt-1">{asset.attributes.quantity}</p>
                  </div>
                )}

                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p className="text-sm mt-1">
                    <Badge variant={asset.attributes.status === 'active' ? 'default' : 'secondary'}>
                      {asset.attributes.status}
                    </Badge>
                  </p>
                </div>

                <div>
                  <Label className="text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 inline mr-1" />
                    Current Location
                  </Label>
                  {currentLocation ? (
                    <p className="text-sm mt-1">
                      <Link to={`/locations/${currentLocation.id}`} className="hover:underline">
                        <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                          {currentLocation.name}
                          <ExternalLink className="h-3 w-3 ml-1 inline" />
                        </Badge>
                      </Link>
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">Not assigned to a location</p>
                  )}
                </div>

                {asset.attributes.notes && (
                  <div>
                    <Label className="text-muted-foreground">Notes</Label>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{asset.attributes.notes}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metadata Sidebar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Asset Type</span>
              <span className="font-medium">{assetTypeTitle}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Package className="h-4 w-4" /> Sub-Assets
              </span>
              <span className="font-bold">{attrs.child_count || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <FileText className="h-4 w-4" /> Log Entries
              </span>
              <span className="font-bold">{attrs.log_count || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <ArrowUpRight className="h-4 w-4" /> Movements
              </span>
              <span className="font-bold">{movementCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Created</span>
              <span className="font-medium">{new Date(asset.attributes.created_at).toLocaleDateString()}</span>
            </div>
            {asset.attributes.updated_at && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span className="font-medium">{new Date(asset.attributes.updated_at).toLocaleDateString()}</span>
              </div>
            )}

            {/* Back References */}
            {((attrs.referencing_task_count > 0 || attrs.referencing_plan_count > 0)) && (
              <div className="pt-4 border-t">
                <BackReferences
                  entityType="asset"
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

      {/* Parent Asset Section */}
      {parentSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Parent Asset
            </CardTitle>
            <CardDescription>This asset belongs to a parent asset</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              to={`/records/assets/${parentSummary.asset_type}/${parentSummary.id}`}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {(() => {
                  const ParentIcon = assetTypeIcons[parentSummary.asset_type] || Package;
                  return <ParentIcon className="h-4 w-4" />;
                })()}
                <span className="font-medium">{parentSummary.name}</span>
                <Badge variant="outline" className="text-xs capitalize">
                  {parentSummary.asset_type}
                </Badge>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Child Assets Section */}
      {childrenSummaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Sub-Assets
            </CardTitle>
            <CardDescription>
              {childrenSummaries.length} asset{childrenSummaries.length !== 1 ? 's' : ''} under this {assetType}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {childrenSummaries.map((child: any) => {
                const ChildIcon = assetTypeIcons[child.asset_type] || Package;
                return (
                  <Link
                    key={child.id}
                    to={`/records/assets/${child.asset_type}/${child.id}`}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <ChildIcon className="h-4 w-4" />
                      <span className="font-medium">{child.name}</span>
                      {child.quantity && (
                        <Badge variant="outline" className="text-xs">
                          Qty: {child.quantity}
                        </Badge>
                      )}
                      <Badge
                        variant={child.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {child.status}
                      </Badge>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                );
              })}
              {(attrs.child_count || 0) > 20 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Showing 20 of {attrs.child_count} sub-assets
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Movement History Section */}
      {recentMovements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5" />
              Movement History
            </CardTitle>
            <CardDescription>
              Recent location changes for this asset
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentMovements.map((movement: any) => {
                const fromLocation = locations.find(loc => Number(loc.id) === movement.from_location_id);
                const toLocation = locations.find(loc => Number(loc.id) === movement.to_location_id);
                return (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{movement.name}</span>
                        <Badge variant={movement.status === 'done' ? 'default' : 'secondary'} className="text-xs">
                          {movement.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        {fromLocation && (
                          <>
                            <Link
                              to={`/locations/${fromLocation.id}`}
                              className="hover:underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ArrowDownLeft className="h-3 w-3 text-orange-600" />
                              {fromLocation.name}
                            </Link>
                            <span>→</span>
                          </>
                        )}
                        {toLocation && (
                          <Link
                            to={`/locations/${toLocation.id}`}
                            className="hover:underline flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ArrowUpRight className="h-3 w-3 text-green-600" />
                            {toLocation.name}
                          </Link>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        {movement.timestamp ? format(new Date(movement.timestamp), 'MMM d, yyyy h:mm a') : 'Unknown date'}
                      </div>
                    </div>
                  </div>
                );
              })}
              {movementCount > 10 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Showing 10 most recent of {movementCount} movements
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs Section */}
      <AssetLogsSection
        logs={attrs.recent_logs || []}
        logCount={attrs.log_count ?? 0}
        onNavigateToLog={(logType) => navigate(`/records/logs/${logType}`)}
      />
    </div>
  );
};

export default AssetDetail;
