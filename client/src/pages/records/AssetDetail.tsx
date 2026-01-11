import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAssets, useUpdateAsset, useDeleteAsset } from '@/hooks/useAssets';
import { useLocations } from '@/hooks/useLocations';
import { Asset } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { BackReferences } from '@/components/BackReferences';
import { toast } from 'sonner';

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

  // Fetch all assets to find the specific one
  const { data, isLoading } = useAssets(assetType, 1, 100);
  const { locations } = useLocations();
  const updateAsset = useUpdateAsset(assetType);
  const deleteAsset = useDeleteAsset(assetType);

  const asset = data?.data?.find(a => String(a.id) === String(id));

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
      toast.error('Failed to update asset');
    }
  };

  const handleDelete = async () => {
    if (!asset) return;
    try {
      await deleteAsset.mutateAsync(asset.id);
      toast.success('Asset deleted successfully');
      navigate(`/records/assets/${assetType}`);
    } catch (error) {
      toast.error('Failed to delete asset');
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

  const assetTypeTitle = assetType.charAt(0).toUpperCase() + assetType.slice(1);
  const currentLocation = locations.find(loc => Number(loc.id) === asset.attributes.current_location_id);

  return (
    <div className="p-6 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate(`/records/assets/${assetType}`)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to {assetTypeTitle}s
      </Button>

      {/* Header with Title and Actions */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{asset.attributes.name}</h1>
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
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Asset</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{asset.attributes.name}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Status and Metadata */}
      <div className="flex flex-wrap gap-3">
        <Badge variant={asset.attributes.status === 'active' ? 'default' : 'secondary'}>
          {asset.attributes.status}
        </Badge>
        {currentLocation && (
          <Badge variant="outline" className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {currentLocation.name}
          </Badge>
        )}
      </div>

      {/* Main Content */}
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
                      <SelectItem value="inactive">Inactive</SelectItem>
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
                      <Badge variant="outline">{currentLocation.name}</Badge>
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
            <CardTitle className="text-base">Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-muted-foreground">Asset Type</p>
              <p className="font-medium mt-1">{assetTypeTitle}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium mt-1">{new Date(asset.attributes.created).toLocaleDateString()}</p>
            </div>
            {asset.attributes.updated && (
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p className="font-medium mt-1">{new Date(asset.attributes.updated).toLocaleDateString()}</p>
              </div>
            )}

            {/* Back References - tasks and plans that reference this asset */}
            {((asset.attributes as any).referencing_task_count > 0 ||
              (asset.attributes as any).referencing_plan_count > 0) && (
              <div className="pt-4 border-t">
                <BackReferences
                  entityType="asset"
                  referencingTaskCount={(asset.attributes as any).referencing_task_count}
                  referencingPlanCount={(asset.attributes as any).referencing_plan_count}
                  referencingTasks={((asset.attributes as any).referencing_tasks || []).map((t: any) => ({
                    id: t.id,
                    name: t.title,
                    type: 'task' as const,
                    state: t.state,
                  }))}
                  referencingPlans={((asset.attributes as any).referencing_plans || []).map((p: any) => ({
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
    </div>
  );
};

export default AssetDetail;
