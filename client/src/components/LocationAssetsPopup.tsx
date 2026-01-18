import React from 'react';
import { Asset } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sprout, 
  Tractor, 
  Warehouse, 
  Beef, 
  Leaf,
  Package,
  MapPin,
  ExternalLink,
} from 'lucide-react';

interface LocationAssetsPopupProps {
  locationId: string | number;
  locationName: string;
  assets: Asset[];
  isLoading: boolean;
  onAssetClick?: (asset: Asset) => void;
}

const getAssetIcon = (assetType: string) => {
  const iconMap: Record<string, React.ElementType> = {
    animal: Beef,
    plant: Sprout,
    equipment: Tractor,
    structure: Warehouse,
    compost: Leaf,
    material: Package,
  };
  return iconMap[assetType] || MapPin;
};

const getAssetColor = (assetType: string) => {
  const colorMap: Record<string, string> = {
    animal: 'bg-amber-500/10 text-amber-700 border-amber-300',
    plant: 'bg-green-500/10 text-green-700 border-green-300',
    equipment: 'bg-blue-500/10 text-blue-700 border-blue-300',
    structure: 'bg-purple-500/10 text-purple-700 border-purple-300',
    compost: 'bg-emerald-500/10 text-emerald-700 border-emerald-300',
    material: 'bg-orange-500/10 text-orange-700 border-orange-300',
  };
  return colorMap[assetType] || 'bg-gray-500/10 text-gray-700 border-gray-300';
};

export const LocationAssetsPopup: React.FC<LocationAssetsPopupProps> = ({
  locationId,
  locationName,
  assets,
  isLoading,
  onAssetClick,
}) => {
  // Group assets by type
  const assetsByType = assets.reduce((acc, asset) => {
    const type = asset.attributes.asset_type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(asset);
    return acc;
  }, {} as Record<string, Asset[]>);

  const totalAssets = assets.length;

  return (
    <div className="min-w-[280px] max-w-[350px] overflow-hidden">
      {/* Header */}
      <div className="mb-3 pb-3 border-b">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <h3 className="font-semibold text-sm truncate">{locationName}</h3>
          </div>
          <a
            href={`/locations/${locationId}`}
            className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0 whitespace-nowrap"
          >
            View Details
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            {totalAssets} {totalAssets === 1 ? 'Asset' : 'Assets'}
          </Badge>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-4 text-center text-sm text-muted-foreground">
          Loading assets...
        </div>
      )}

      {/* No Assets */}
      {!isLoading && totalAssets === 0 && (
        <div className="py-4 text-center text-sm text-muted-foreground">
          No assets at this location
        </div>
      )}

      {/* Assets List */}
      {!isLoading && totalAssets > 0 && (
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-3">
            {Object.entries(assetsByType).map(([type, typeAssets]) => {
              const Icon = getAssetIcon(type);
              const colorClass = getAssetColor(type);
              
              return (
                <div key={type} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase">
                      {type} ({typeAssets.length})
                    </span>
                  </div>
                  <div className="space-y-1 pl-5">
                    {typeAssets.map((asset) => (
                      <div
                        key={asset.id}
                        onClick={() => onAssetClick?.(asset)}
                        className={`flex items-center justify-between gap-2 p-2 rounded-md border ${colorClass} transition-all ${onAssetClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : ''} group`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                              {asset.attributes.name}
                            </p>
                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary shrink-0" />
                          </div>
                          {asset.attributes.quantity && (
                            <p className="text-xs text-muted-foreground">
                              Qty: {asset.attributes.quantity}
                            </p>
                          )}
                        </div>
                        <Badge 
                          variant={asset.attributes.status === 'active' ? 'default' : 'secondary'}
                          className="text-xs shrink-0"
                        >
                          {asset.attributes.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Footer Stats */}
      {!isLoading && totalAssets > 0 && (
        <div className="mt-3 pt-3 border-t">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(assetsByType).map(([type, typeAssets]) => {
              const Icon = getAssetIcon(type);
              return (
                <div key={type} className="flex items-center gap-1.5 text-muted-foreground">
                  <Icon className="h-3 w-3" />
                  <span className="capitalize">{type}:</span>
                  <span className="font-medium text-foreground">{typeAssets.length}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

