import React, { useState } from 'react';
import { Plus, LucideIcon, MapPin, Link2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAssets, useCreateAsset } from '@/hooks/useAssets';
import { useLocations } from '@/hooks/useLocations';
import { Skeleton } from '@/components/ui/skeleton';
import { Asset } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

interface GenericAssetPageProps {
  assetType: string;
  title: string;
  titlePlural: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  quantityLabel?: string;
}

export const GenericAssetPage: React.FC<GenericAssetPageProps> = ({
  assetType,
  title,
  titlePlural,
  description,
  icon: Icon,
  iconColor,
  quantityLabel = 'items',
}) => {
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    quantity: '',
    notes: '',
    current_location_id: '' as string | number,
  });

  const { data, isLoading, error } = useAssets(assetType);
  const { locations } = useLocations();
  const createAsset = useCreateAsset(assetType);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createAsset.mutateAsync({
      name: createFormData.name,
      quantity: createFormData.quantity ? parseFloat(createFormData.quantity) : undefined,
      notes: createFormData.notes,
      current_location_id: createFormData.current_location_id ? Number(createFormData.current_location_id) : null,
    });
    setIsCreateDialogOpen(false);
    setCreateFormData({ name: '', quantity: '', notes: '', current_location_id: '' });
  };

  const handleAssetClick = (asset: Asset) => {
    navigate(`/records/assets/${assetType}/${asset.id}`);
  };

  const assets = data?.data || [];
  const totalCount = data?.meta?.total || 0;
  const totalQuantity = assets.reduce((sum, a) => sum + (a.attributes.quantity || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Icon className={`h-8 w-8 ${iconColor}`} />
            {titlePlural}
          </h1>
          <p className="text-muted-foreground mt-2">{description}</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add {title}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Add New {title}</DialogTitle>
              <DialogDescription>Add a new {title.toLowerCase()} to your farm inventory</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={createFormData.name} onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })} placeholder={`e.g., ${title} name`} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" type="number" min="0" value={createFormData.quantity} onChange={(e) => setCreateFormData({ ...createFormData, quantity: e.target.value })} placeholder={`Number of ${quantityLabel}`} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">
                  <MapPin className="h-3.5 w-3.5 inline mr-1" />
                  Current Location
                </Label>
                <Select value={createFormData.current_location_id?.toString() || 'none'} onValueChange={(value) => setCreateFormData({ ...createFormData, current_location_id: value === 'none' ? '' : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a location (optional)" />
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
                <p className="text-xs text-muted-foreground">Where is this {title.toLowerCase()} currently located?</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={createFormData.notes} onChange={(e) => setCreateFormData({ ...createFormData, notes: e.target.value })} placeholder="Additional details..." rows={4} />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createAsset.isPending}>{createAsset.isPending ? 'Creating...' : `Create ${title}`}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Total {titlePlural}</CardTitle><CardDescription>Number of groups/items</CardDescription></CardHeader>
          <CardContent>{isLoading ? <Skeleton className="h-9 w-16" /> : <p className="text-3xl font-bold">{totalCount}</p>}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total Count</CardTitle><CardDescription>Combined {quantityLabel}</CardDescription></CardHeader>
          <CardContent>{isLoading ? <Skeleton className="h-9 w-16" /> : <p className="text-3xl font-bold">{totalQuantity}</p>}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Active</CardTitle><CardDescription>Active items</CardDescription></CardHeader>
          <CardContent>{isLoading ? <Skeleton className="h-9 w-16" /> : <p className="text-3xl font-bold">{assets.filter(a => a.attributes.status === 'active').length}</p>}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{titlePlural} Inventory</CardTitle><CardDescription>All {titlePlural.toLowerCase()} on your farm</CardDescription></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : error ? (
            <div className="text-center py-12 text-destructive"><p className="text-lg mb-2">Error loading {titlePlural.toLowerCase()}</p><p className="text-sm">{error.message}</p></div>
          ) : assets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Icon className={`h-16 w-16 mx-auto mb-4 opacity-50 ${iconColor}`} />
              <p className="text-lg mb-2">No {titlePlural.toLowerCase()} registered</p>
              <p className="text-sm mb-4">Start by adding your first {title.toLowerCase()}</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add First {title}</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {assets.map((asset) => (
                <div key={asset.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer group" onClick={() => handleAssetClick(asset)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{asset.attributes.name}</h3>
                      {asset.attributes.quantity && (
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {asset.attributes.quantity} {quantityLabel}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full capitalize ${asset.attributes.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}`}>{asset.attributes.status}</span>
                      {asset.attributes.current_location_id && (
                        <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {locations.find(loc => Number(loc.id) === asset.attributes.current_location_id)?.name || 'Unknown'}
                        </span>
                      )}
                    </div>
                    {asset.attributes.notes && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{asset.attributes.notes}</p>}
                  </div>
                  <Link2 className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors ml-2 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

