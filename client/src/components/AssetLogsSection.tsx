import React, { useState, useMemo } from 'react';
import { FileText, Calendar, ExternalLink, Package, Hammer, Plus, MoveRight, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface LogEntry {
  id: number;
  name: string;
  log_type: string;
  timestamp: string;
  status: string;
  to_location_id?: number | null;
}

interface AssetLogsSectionProps {
  logs: LogEntry[];
  logCount: number;
  onNavigateToLog: (logType: string) => void;
}

const logTypeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  harvest: { icon: Package, color: 'text-green-600 bg-green-100', label: 'Harvest' },
  activity: { icon: Hammer, color: 'text-orange-600 bg-orange-100', label: 'Activity' },
  input: { icon: Plus, color: 'text-blue-600 bg-blue-100', label: 'Input' },
  movement: { icon: MoveRight, color: 'text-cyan-600 bg-cyan-100', label: 'Movement' },
  observation: { icon: Eye, color: 'text-purple-600 bg-purple-100', label: 'Observation' },
};

export const AssetLogsSection: React.FC<AssetLogsSectionProps> = ({
  logs,
  logCount,
  onNavigateToLog,
}) => {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Get unique log types from the logs
  const availableTypes = useMemo(() => {
    const types = new Set(logs.map(log => log.log_type));
    return Array.from(types).sort();
  }, [logs]);

  // Filter logs by selected type
  const filteredLogs = useMemo(() => {
    if (!selectedType) return logs;
    return logs.filter(log => log.log_type === selectedType);
  }, [logs, selectedType]);

  // Count logs by type
  const logsByType = useMemo(() => {
    return logs.reduce((acc, log) => {
      acc[log.log_type] = (acc[log.log_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [logs]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Logs
        </CardTitle>
        <CardDescription>
          {logCount > 0
            ? `${logCount} log ${logCount === 1 ? 'entry' : 'entries'} associated with this asset`
            : 'Logs associated with this asset will appear here'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length > 0 ? (
          <div className="space-y-4">
            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedType === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(null)}
              >
                All ({logs.length})
              </Button>
              {availableTypes.map(type => {
                const config = logTypeConfig[type] || { icon: FileText, color: 'text-gray-600 bg-gray-100', label: type };
                const Icon = config.icon;
                return (
                  <Button
                    key={type}
                    variant={selectedType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedType(type)}
                    className="gap-1"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {config.label} ({logsByType[type] || 0})
                  </Button>
                );
              })}
            </div>

            {/* Logs List */}
            <div className="space-y-3">
              {filteredLogs.map((log) => {
                const config = logTypeConfig[log.log_type] || { icon: FileText, color: 'text-gray-600 bg-gray-100', label: log.log_type };
                const Icon = config.icon;
                return (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{log.name}</span>
                        <Badge variant="outline" className={`text-xs gap-1 ${config.color}`}>
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                        {log.status && (
                          <Badge variant={log.status === 'done' ? 'default' : 'secondary'} className="text-xs">
                            {log.status}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigateToLog(log.log_type)}
                      className="flex items-center gap-1"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

            {logCount > 10 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                Showing 10 most recent of {logCount} logs
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No logs yet</p>
            <p className="text-xs mt-1">Logs created with this asset will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AssetLogsSection;
