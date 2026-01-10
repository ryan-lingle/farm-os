import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Tractor, Sprout, Recycle, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const assetTypes = [
  {
    title: 'Animals',
    description: 'Livestock, poultry, and other farm animals',
    icon: Users,
    url: '/records/assets/animals',
    color: 'text-orange-600'
  },
  {
    title: 'Equipment',
    description: 'Tractors, tools, and farm machinery',
    icon: Tractor,
    url: '/records/assets/equipment',
    color: 'text-blue-600'
  },
  {
    title: 'Plants',
    description: 'Crops, trees, and planted vegetation',
    icon: Sprout,
    url: '/records/assets/plants',
    color: 'text-green-600'
  },
  {
    title: 'Compost',
    description: 'Organic matter and soil amendments',
    icon: Recycle,
    url: '/records/assets/compost',
    color: 'text-amber-600'
  }
];

const Assets = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Assets</h1>
          <p className="text-muted-foreground mt-2">
            Manage all your farm assets and resources
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Asset
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {assetTypes.map((asset) => (
          <Card key={asset.title} className="hover:shadow-md transition-shadow cursor-pointer">
            <Link to={asset.url}>
              <CardHeader className="text-center">
                <asset.icon className={`h-12 w-12 mx-auto mb-2 ${asset.color}`} />
                <CardTitle className="text-lg">{asset.title}</CardTitle>
                <CardDescription className="text-sm">
                  {asset.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-muted-foreground">0</p>
                  <p className="text-sm text-muted-foreground">Total {asset.title.toLowerCase()}</p>
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>

      {/* Recent Assets */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Assets</CardTitle>
          <CardDescription>Recently added or updated assets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No assets found</p>
            <p className="text-sm">Create your first asset to get started</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Assets;