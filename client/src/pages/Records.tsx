import React from 'react';
import { Link } from 'react-router-dom';
import { Package, ScrollText, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Records = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Records</h1>
          <p className="text-muted-foreground mt-2">
            Manage your farm assets and activity logs
          </p>
        </div>
        <Button asChild>
          <Link to="/records/assets">
            <Plus className="h-4 w-4 mr-2" />
            New Record
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Assets Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Assets
            </CardTitle>
            <CardDescription>
              Manage your farm assets including animals, equipment, plants, and materials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" asChild className="w-full justify-start">
                <Link to="/records/assets/animals">Animals</Link>
              </Button>
              <Button variant="outline" asChild className="w-full justify-start">
                <Link to="/records/assets/equipment">Equipment</Link>
              </Button>
              <Button variant="outline" asChild className="w-full justify-start">
                <Link to="/records/assets/plants">Plants</Link>
              </Button>
              <Button variant="outline" asChild className="w-full justify-start">
                <Link to="/records/assets/compost">Compost</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-primary" />
              Logs
            </CardTitle>
            <CardDescription>
              Track farm activities, inputs, harvests, and observations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" asChild className="w-full justify-start">
                <Link to="/records/logs/harvest">Harvest</Link>
              </Button>
              <Button variant="outline" asChild className="w-full justify-start">
                <Link to="/records/logs/input">Input</Link>
              </Button>
              <Button variant="outline" asChild className="w-full justify-start">
                <Link to="/records/logs/activity">Activity</Link>
              </Button>
              <Button variant="outline" asChild className="w-full justify-start">
                <Link to="/records/logs/observation">Observation</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest records and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ScrollText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent activity to display</p>
            <p className="text-sm">Start by creating your first asset or log entry</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Records;