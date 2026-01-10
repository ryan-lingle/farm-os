import React, { useState } from 'react';
import { Plus, Trash2, Eye, Pencil, LucideIcon, MapPin, Package, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLogs, useCreateLog, useDeleteLog, useUpdateLog } from '@/hooks/useLogs';
import { useLocations } from '@/hooks/useLocations';
import { useAssets } from '@/hooks/useAssets';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { Log } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface GenericLogPageProps {
  logType: string;
  title: string;
  titlePlural: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  showQuantity?: boolean;
  quantityLabel?: string;
  defaultUnit?: string;
}

export const GenericLogPage: React.FC<GenericLogPageProps> = ({
  logType,
  title,
  titlePlural,
  description,
  icon: Icon,
  iconColor,
  showQuantity = false,
  quantityLabel = 'Amount',
  defaultUnit = 'units',
}) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    timestamp: new Date().toISOString().slice(0, 16),
    notes: '',
    location_id: '' as string,
    asset_ids: [] as string[],
    quantity_value: '',
    quantity_unit: defaultUnit,
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    timestamp: '',
    notes: '',
  });

  const { data, isLoading, error } = useLogs(logType);
  const { locations } = useLocations();

  // Get all asset types for selection
  const { data: animalData } = useAssets('animal');
  const { data: plantData } = useAssets('plant');
  const { data: equipmentData } = useAssets('equipment');

  const allAssets = [
    ...(animalData?.data || []),
    ...(plantData?.data || []),
    ...(equipmentData?.data || []),
  ];

  const createLog = useCreateLog(logType);
  const updateLog = useUpdateLog(logType);
  const deleteLog = useDeleteLog(logType);

  const toggleAssetSelection = (assetId: string) => {
    setCreateFormData(prev => ({
      ...prev,
      asset_ids: prev.asset_ids.includes(assetId)
        ? prev.asset_ids.filter(id => id !== assetId)
        : [...prev.asset_ids, assetId]
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const logData: any = {
      name: createFormData.name,
      timestamp: new Date(createFormData.timestamp).toISOString(),
      notes: createFormData.notes,
      status: 'done',
    };

    if (createFormData.location_id) {
      logData.to_location_id = Number(createFormData.location_id);
    }

    if (createFormData.asset_ids.length > 0) {
      logData.asset_ids = createFormData.asset_ids.map(id => Number(id));
    }

    if (showQuantity && createFormData.quantity_value) {
      logData.quantities_attributes = [{
        value: parseFloat(createFormData.quantity_value),
        unit: createFormData.quantity_unit,
        quantity_type: logType,
      }];
    }

    await createLog.mutateAsync(logData);
    setIsCreateDialogOpen(false);
    setCreateFormData({
      name: '',
      timestamp: new Date().toISOString().slice(0, 16),
      notes: '',
      location_id: '',
      asset_ids: [],
      quantity_value: '',
      quantity_unit: defaultUnit,
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLog) return;
    await updateLog.mutateAsync({
      id: selectedLog.id,
      data: {
        name: editFormData.name,
        timestamp: new Date(editFormData.timestamp).toISOString(),
        notes: editFormData.notes,
      }
    });
    setIsEditing(false);
  };

  const handleDelete = async (id: string) => {
    await deleteLog.mutateAsync(id);
    if (selectedLog?.id === id) {
      setIsDetailDialogOpen(false);
      setSelectedLog(null);
    }
  };

  const openDetailDialog = (log: Log) => {
    setSelectedLog(log);
    setEditFormData({
      name: log.attributes.name,
      timestamp: new Date(log.attributes.timestamp).toISOString().slice(0, 16),
      notes: log.attributes.notes || '',
    });
    setIsEditing(false);
    setIsDetailDialogOpen(true);
  };

  const logs = data?.data || [];
  const totalCount = data?.meta?.total || logs.length;

  const thisMonth = new Date();
  const thisMonthCount = logs.filter(log => {
    const logDate = new Date(log.attributes.timestamp);
    return logDate.getMonth() === thisMonth.getMonth() &&
           logDate.getFullYear() === thisMonth.getFullYear();
  }).length;

  const thisWeekCount = logs.filter(log => {
    const logDate = new Date(log.attributes.timestamp);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return logDate >= weekAgo;
  }).length;

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
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New {title}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record {title}</DialogTitle>
              <DialogDescription>Create a new {logType} log entry</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                  placeholder={`e.g., ${title} - ${format(new Date(), 'MMM yyyy')}`}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timestamp">
                  <Calendar className="h-3.5 w-3.5 inline mr-1" />
                  Date & Time
                </Label>
                <Input
                  id="timestamp"
                  type="datetime-local"
                  value={createFormData.timestamp}
                  onChange={(e) => setCreateFormData({ ...createFormData, timestamp: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">When did this {title.toLowerCase()} occur?</p>
              </div>

              {showQuantity && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">{quantityLabel}</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.01"
                      min="0"
                      value={createFormData.quantity_value}
                      onChange={(e) => setCreateFormData({ ...createFormData, quantity_value: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Input
                      id="unit"
                      value={createFormData.quantity_unit}
                      onChange={(e) => setCreateFormData({ ...createFormData, quantity_unit: e.target.value })}
                      placeholder="lbs, kg, gallons, etc."
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="location">
                  <MapPin className="h-3.5 w-3.5 inline mr-1" />
                  Location
                </Label>
                <Select
                  value={createFormData.location_id || 'none'}
                  onValueChange={(value) => setCreateFormData({ ...createFormData, location_id: value === 'none' ? '' : value })}
                >
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
              </div>

              {allAssets.length > 0 && (
                <div className="space-y-2">
                  <Label>
                    <Package className="h-3.5 w-3.5 inline mr-1" />
                    Related Assets
                  </Label>
                  <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                    {allAssets.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No assets available</p>
                    ) : (
                      allAssets.map((asset) => (
                        <div key={asset.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`asset-${asset.id}`}
                            checked={createFormData.asset_ids.includes(asset.id)}
                            onCheckedChange={() => toggleAssetSelection(asset.id)}
                          />
                          <label
                            htmlFor={`asset-${asset.id}`}
                            className="text-sm cursor-pointer flex items-center gap-2"
                          >
                            {asset.attributes.name}
                            <Badge variant="outline" className="text-xs">
                              {asset.attributes.asset_type}
                            </Badge>
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Select assets involved in this {title.toLowerCase()}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={createFormData.notes}
                  onChange={(e) => setCreateFormData({ ...createFormData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createLog.isPending}>
                  {createLog.isPending ? 'Recording...' : 'Record Log'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Total {titlePlural}</CardTitle><CardDescription>All recorded entries</CardDescription></CardHeader>
          <CardContent>{isLoading ? <Skeleton className="h-9 w-16" /> : <p className="text-3xl font-bold">{totalCount}</p>}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>This Month</CardTitle><CardDescription>Entries this month</CardDescription></CardHeader>
          <CardContent>{isLoading ? <Skeleton className="h-9 w-16" /> : <p className="text-3xl font-bold">{thisMonthCount}</p>}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>This Week</CardTitle><CardDescription>Entries this week</CardDescription></CardHeader>
          <CardContent>{isLoading ? <Skeleton className="h-9 w-16" /> : <p className="text-3xl font-bold">{thisWeekCount}</p>}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{title} History</CardTitle><CardDescription>All {logType} logs</CardDescription></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : error ? (
            <div className="text-center py-12 text-destructive"><p className="text-lg mb-2">Error loading logs</p><p className="text-sm">{error.message}</p></div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Icon className={`h-16 w-16 mx-auto mb-4 opacity-50 ${iconColor}`} />
              <p className="text-lg mb-2">No {titlePlural.toLowerCase()} recorded</p>
              <p className="text-sm mb-4">Start by recording your first {title.toLowerCase()}</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add First {title}</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
                  <div className="flex-1 cursor-pointer" onClick={() => openDetailDialog(log)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{log.attributes.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(log.attributes.timestamp), 'MMM d, yyyy h:mm a')}
                      </Badge>
                      {log.attributes.to_location_id && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {locations.find(loc => Number(loc.id) === log.attributes.to_location_id)?.name || 'Unknown'}
                        </Badge>
                      )}
                    </div>
                    {log.attributes.notes && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{log.attributes.notes}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openDetailDialog(log)}><Eye className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="outline" size="sm"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete Log</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete this log?</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(log.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail/Edit Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedLog?.attributes.name}</DialogTitle>
            <DialogDescription>{isEditing ? 'Edit log details' : 'View log information'}</DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                {isEditing ? (
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="space-y-2"><Label>Name *</Label><Input value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} required /></div>
                    <div className="space-y-2"><Label>Date & Time</Label><Input type="datetime-local" value={editFormData.timestamp} onChange={(e) => setEditFormData({ ...editFormData, timestamp: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Notes</Label><Textarea value={editFormData.notes} onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })} rows={4} /></div>
                    <div className="flex justify-between pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                      <Button type="submit" disabled={updateLog.isPending}>{updateLog.isPending ? 'Saving...' : 'Save Changes'}</Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div><Label className="text-muted-foreground">Date & Time</Label><p className="text-lg">{format(new Date(selectedLog.attributes.timestamp), 'MMM d, yyyy h:mm a')}</p></div>
                    {selectedLog.attributes.to_location_id && (
                      <div>
                        <Label className="text-muted-foreground">Location</Label>
                        <p className="text-lg flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {locations.find(loc => Number(loc.id) === selectedLog.attributes.to_location_id)?.name || 'Unknown'}
                        </p>
                      </div>
                    )}
                    {selectedLog.attributes.notes && <div><Label className="text-muted-foreground">Notes</Label><p className="text-sm mt-1">{selectedLog.attributes.notes}</p></div>}
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground pt-4 border-t">
                      <div><Label className="text-muted-foreground">Created</Label><p>{new Date(selectedLog.attributes.created_at).toLocaleString()}</p></div>
                      <div><Label className="text-muted-foreground">Updated</Label><p>{new Date(selectedLog.attributes.updated_at).toLocaleString()}</p></div>
                    </div>
                    <div className="flex justify-between pt-4">
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete Log</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete this log?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(selectedLog.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button onClick={() => setIsEditing(true)}><Pencil className="h-4 w-4 mr-2" />Edit</Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                <div className="text-center py-8 text-muted-foreground"><p>Activity history coming soon</p></div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
