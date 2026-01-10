import React, { useState } from 'react';
import { Plus, Trash2, Eye, Pencil, LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLogs, useCreateLog, useDeleteLog, useUpdateLog } from '@/hooks/useLogs';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { Log } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface GenericLogPageProps {
  logType: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
}

export const GenericLogPage: React.FC<GenericLogPageProps> = ({
  logType,
  title,
  description,
  icon: Icon,
  iconColor,
}) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    timestamp: new Date().toISOString().slice(0, 16),
    notes: '',
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    timestamp: '',
    status: 'done',
    notes: '',
  });

  const { data, isLoading, error } = useLogs(logType);
  const createLog = useCreateLog(logType);
  const updateLog = useUpdateLog(logType);
  const deleteLog = useDeleteLog(logType);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createLog.mutateAsync({
      name: createFormData.name,
      timestamp: new Date(createFormData.timestamp).toISOString(),
      notes: createFormData.notes,
    });
    setIsCreateDialogOpen(false);
    setCreateFormData({
      name: '',
      timestamp: new Date().toISOString().slice(0, 16),
      notes: '',
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
        status: editFormData.status,
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
      status: log.attributes.status,
      notes: log.attributes.notes || '',
    });
    setIsEditing(false);
    setIsDetailDialogOpen(true);
  };

  const logs = data?.data || [];
  const totalCount = data?.meta?.total || 0;

  const thisMonth = new Date();
  const thisMonthCount = logs.filter(log => {
    const logDate = new Date(log.attributes.timestamp);
    return logDate.getMonth() === thisMonth.getMonth() && 
           logDate.getFullYear() === thisMonth.getFullYear();
  }).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Icon className={`h-8 w-8 ${iconColor}`} />
            {title}
          </h1>
          <p className="text-muted-foreground mt-2">{description}</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add {title.replace(' Logs', '')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Record {title.replace(' Logs', '')}</DialogTitle>
              <DialogDescription>Create a new {logType} log entry</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={createFormData.name} onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })} placeholder={`e.g., ${title} - ${format(new Date(), 'MMM yyyy')}`} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timestamp">Date & Time *</Label>
                <Input id="timestamp" type="datetime-local" value={createFormData.timestamp} onChange={(e) => setCreateFormData({ ...createFormData, timestamp: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={createFormData.notes} onChange={(e) => setCreateFormData({ ...createFormData, notes: e.target.value })} placeholder="Additional notes..." rows={4} />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createLog.isPending}>{createLog.isPending ? 'Recording...' : 'Record Log'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Total Logs</CardTitle><CardDescription>All log records</CardDescription></CardHeader>
          <CardContent>{isLoading ? <Skeleton className="h-9 w-16" /> : <p className="text-3xl font-bold">{totalCount}</p>}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>This Month</CardTitle><CardDescription>Logs this month</CardDescription></CardHeader>
          <CardContent>{isLoading ? <Skeleton className="h-9 w-16" /> : <p className="text-3xl font-bold">{thisMonthCount}</p>}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Completed</CardTitle><CardDescription>Completed logs</CardDescription></CardHeader>
          <CardContent>{isLoading ? <Skeleton className="h-9 w-16" /> : <p className="text-3xl font-bold">{logs.filter(l => l.attributes.status === 'done').length}</p>}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{title}</CardTitle><CardDescription>All {logType} logs from your farm</CardDescription></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : error ? (
            <div className="text-center py-12 text-destructive"><p className="text-lg mb-2">Error loading logs</p><p className="text-sm">{error.message}</p></div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Icon className={`h-16 w-16 mx-auto mb-4 opacity-50 ${iconColor}`} />
              <p className="text-lg mb-2">No logs found</p>
              <p className="text-sm mb-4">Start by recording your first {logType} log</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add First Log</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
                  <div className="flex-1 cursor-pointer" onClick={() => openDetailDialog(log)}>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{log.attributes.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${log.attributes.status === 'done' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{log.attributes.status}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">{format(new Date(log.attributes.timestamp), 'MMM d, yyyy h:mm a')}</div>
                    {log.attributes.notes && <p className="text-sm text-muted-foreground mt-1">{log.attributes.notes}</p>}
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
                    <div className="space-y-2"><Label>Status</Label><Select value={editFormData.status} onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="done">Done</SelectItem><SelectItem value="pending">Pending</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>Notes</Label><Textarea value={editFormData.notes} onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })} rows={4} /></div>
                    <div className="flex justify-between pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                      <Button type="submit" disabled={updateLog.isPending}>{updateLog.isPending ? 'Saving...' : 'Save Changes'}</Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div><Label className="text-muted-foreground">Date & Time</Label><p className="text-lg">{format(new Date(selectedLog.attributes.timestamp), 'MMM d, yyyy h:mm a')}</p></div>
                    <div><Label className="text-muted-foreground">Status</Label><p className="text-lg capitalize">{selectedLog.attributes.status}</p></div>
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
