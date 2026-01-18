import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Plus, Hammer, Calendar, FileText, MoveRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const logTypes = [
  {
    title: 'Harvest',
    description: 'Record crop and produce harvests',
    icon: Package,
    url: '/records/logs/harvest',
    color: 'text-green-600'
  },
  {
    title: 'Input',
    description: 'Track seeds, fertilizers, and treatments',
    icon: Plus,
    url: '/records/logs/input',
    color: 'text-blue-600'
  },
  {
    title: 'Activity',
    description: 'Farm work and maintenance activities',
    icon: Hammer,
    url: '/records/logs/activity',
    color: 'text-orange-600'
  },
  {
    title: 'Observation',
    description: 'Notes and field observations',
    icon: Calendar,
    url: '/records/logs/observation',
    color: 'text-purple-600'
  },
  {
    title: 'Movement',
    description: 'Track asset movements between locations',
    icon: MoveRight,
    url: '/records/logs/movement',
    color: 'text-cyan-600'
  }
];

const Logs = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Logs</h1>
          <p className="text-muted-foreground mt-2">
            Track and record all farm activities and observations
          </p>
        </div>
        <Button>
          <FileText className="h-4 w-4 mr-2" />
          New Log
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {logTypes.map((log) => (
          <Card key={log.title} className="hover:shadow-md transition-shadow cursor-pointer">
            <Link to={log.url}>
              <CardHeader className="text-center">
                <log.icon className={`h-12 w-12 mx-auto mb-2 ${log.color}`} />
                <CardTitle className="text-lg">{log.title}</CardTitle>
                <CardDescription className="text-sm">
                  {log.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-muted-foreground">0</p>
                  <p className="text-sm text-muted-foreground">Total entries</p>
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Logs</CardTitle>
          <CardDescription>Latest activity and log entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No logs found</p>
            <p className="text-sm">Create your first log entry to get started</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Logs;