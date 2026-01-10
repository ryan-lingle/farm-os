import React, { useState } from 'react';
import { Package, Trash2, Eye, Pencil, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useLogs, useDeleteLog, useCreateLog, useCompleteLog } from '@/hooks/useLogs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { Log } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HarvestLogForm, HarvestLogData } from './HarvestLogForm';
import { Badge } from '@/components/ui/badge';

export const HarvestLogPage: React.FC = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const { data, isLoading, error } = useLogs('harvest');
  const createLog = useCreateLog('harvest');
  const completeLog = useCompleteLog('harvest');
  const deleteLog = useDeleteLog('harvest');

  const handleCreate = async (data: HarvestLogData, saveAndComplete: boolean) => {
    await createLog.mutateAsync(data);
    setIsCreateDialogOpen(false);
  };

  const handleComplete = async (logId: string) => {
    await completeLog.mutateAsync(logId);
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
    setIsDetailDialogOpen(true);
  };

  const logs = data?.data || [];
  const totalCount = data?.meta?.total || 0;

  const thisMonth = new Date();
  const thisMonthCount = logs.filter((log) => {
    const logDate = new Date(log.attributes.timestamp);
    return (
      logDate.getMonth() === thisMonth.getMonth() &&
      logDate.getFullYear() === thisMonth.getFullYear()
    );
  }).length;

  const pendingCount = logs.filter((l) => l.attributes.status === 'pending').length;
  const completedCount = logs.filter((l) => l.attributes.status === 'done').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Package className="h-8 w-8 text-green-600" />
            Harvest Logs
          </h1>
          <p className="text-muted-foreground mt-2">
            Record and track harvests from your animals and plants
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Package className="h-4 w-4 mr-2" />
          New Harvest
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Harvests</CardTitle>
            <CardDescription>All harvest records</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p className="text-3xl font-bold">{totalCount}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>This Month</CardTitle>
            <CardDescription>Harvests this month</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p className="text-3xl font-bold">{thisMonthCount}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending</CardTitle>
            <CardDescription>Awaiting completion</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completed</CardTitle>
            <CardDescription>Processed harvests</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p className="text-3xl font-bold text-green-600">{completedCount}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Harvest Logs</CardTitle>
          <CardDescription>All harvest logs from your farm</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              <p className="text-lg mb-2">Error loading harvest logs</p>
              <p className="text-sm">{error.message}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-16 w-16 mx-auto mb-4 opacity-50 text-green-600" />
              <p className="text-lg mb-2">No harvest logs found</p>
              <p className="text-sm mb-4">Start by recording your first harvest</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Package className="h-4 w-4 mr-2" />
                Add First Harvest
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1 cursor-pointer" onClick={() => openDetailDialog(log)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{log.attributes.name}</h3>
                      {log.attributes.status === 'done' ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                      {log.relationships?.source_assets?.data && (
                        <Badge variant="outline">
                          {log.relationships.source_assets.data.length} source
                          {log.relationships.source_assets.data.length === 1 ? '' : 's'}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {format(new Date(log.attributes.timestamp), 'MMM d, yyyy h:mm a')}
                    </div>
                    {log.attributes.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{log.attributes.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {log.attributes.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 hover:text-green-700"
                        onClick={() => handleComplete(log.id)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => openDetailDialog(log)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Harvest Log</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this harvest log? This action cannot be
                            undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(log.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <HarvestLogForm
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
        isPending={createLog.isPending}
      />

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedLog?.attributes.name}</DialogTitle>
            <DialogDescription>Harvest log details</DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="relationships">Relationships</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    {selectedLog.attributes.status === 'done' ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Date & Time</Label>
                  <p className="text-lg">
                    {format(new Date(selectedLog.attributes.timestamp), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>

                {selectedLog.attributes.notes && (
                  <div>
                    <Label className="text-muted-foreground">Notes</Label>
                    <p className="text-sm mt-1">{selectedLog.attributes.notes}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground pt-4 border-t">
                  <div>
                    <Label className="text-muted-foreground">Created</Label>
                    <p>{new Date(selectedLog.attributes.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Updated</Label>
                    <p>{new Date(selectedLog.attributes.updated_at).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Harvest Log</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this harvest log? This action cannot be
                          undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(selectedLog.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {selectedLog.attributes.status === 'pending' && (
                    <Button onClick={() => handleComplete(selectedLog.id)}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Complete Harvest
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="relationships" className="mt-4">
                <div className="space-y-4">
                  {selectedLog.relationships?.source_assets?.data && (
                    <div>
                      <Label className="text-muted-foreground">Source Assets</Label>
                      <div className="mt-2 space-y-1">
                        {selectedLog.relationships.source_assets.data.map((asset) => (
                          <div
                            key={asset.id}
                            className="text-sm p-2 border rounded flex items-center justify-between"
                          >
                            <span>
                              {asset.type} #{asset.id}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              source
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedLog.relationships?.output_assets?.data && (
                    <div>
                      <Label className="text-muted-foreground">Output Assets</Label>
                      <div className="mt-2 space-y-1">
                        {selectedLog.relationships.output_assets.data.map((asset) => (
                          <div
                            key={asset.id}
                            className="text-sm p-2 border rounded flex items-center justify-between"
                          >
                            <span>
                              {asset.type} #{asset.id}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              output
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedLog.relationships?.quantities?.data && (
                    <div>
                      <Label className="text-muted-foreground">Quantities</Label>
                      <div className="mt-2 space-y-1">
                        {selectedLog.relationships.quantities.data.map((qty) => (
                          <div key={qty.id} className="text-sm p-2 border rounded">
                            Quantity #{qty.id}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!selectedLog.relationships?.source_assets?.data &&
                    !selectedLog.relationships?.output_assets?.data &&
                    !selectedLog.relationships?.quantities?.data && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No relationship data available</p>
                      </div>
                    )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

