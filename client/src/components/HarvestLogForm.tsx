import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAssets } from '@/hooks/useAssets';
import { useLocations } from '@/hooks/useLocations';
import { Asset } from '@/lib/api';
import { Checkbox } from '@/components/ui/checkbox';

interface HarvestLogFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: HarvestLogData, saveAndComplete: boolean) => Promise<void>;
  isPending: boolean;
}

export interface HarvestLogData {
  name: string;
  timestamp: string;
  asset_ids: number[];
  asset_roles: Record<number, string>;
  quantities_attributes: Array<{
    value: number;
    unit: string;
    quantity_type?: string;
  }>;
  to_location_id?: number;
  notes?: string;
  status: 'pending' | 'done';
}

// Common units for harvest logs
const COMMON_UNITS = [
  { value: 'eggs', label: 'Eggs', type: 'count' },
  { value: 'dozen', label: 'Dozen', type: 'count' },
  { value: 'liter', label: 'Liters', type: 'volume' },
  { value: 'liters', label: 'Liters', type: 'volume' },
  { value: 'gallon', label: 'Gallons', type: 'volume' },
  { value: 'gallons', label: 'Gallons', type: 'volume' },
  { value: 'lb', label: 'Pounds (lb)', type: 'weight' },
  { value: 'lbs', label: 'Pounds (lbs)', type: 'weight' },
  { value: 'kg', label: 'Kilograms (kg)', type: 'weight' },
  { value: 'kilogram', label: 'Kilograms', type: 'weight' },
  { value: 'kilograms', label: 'Kilograms', type: 'weight' },
  { value: 'pound', label: 'Pound', type: 'weight' },
  { value: 'pounds', label: 'Pounds', type: 'weight' },
  { value: 'bushel', label: 'Bushel', type: 'volume' },
  { value: 'bushels', label: 'Bushels', type: 'volume' },
  { value: 'ton', label: 'Tons', type: 'weight' },
  { value: 'tons', label: 'Tons', type: 'weight' },
];

export const HarvestLogForm: React.FC<HarvestLogFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    timestamp: new Date().toISOString().slice(0, 16),
    notes: '',
    quantityValue: '',
    quantityUnit: 'eggs',
    useCustomLocation: false,
    toLocationId: '',
  });
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());

  // Fetch animals and plants (assets that can be harvested from)
  const { data: animalsData, isLoading: animalsLoading } = useAssets('animal', 1, 100);
  const { data: plantsData, isLoading: plantsLoading } = useAssets('plant', 1, 100);
  const { locations, isLoading: locationsLoading } = useLocations();

  const animals = animalsData?.data || [];
  const plants = plantsData?.data || [];

  const allHarvestableAssets = [...animals, ...plants].filter(
    asset => asset.attributes.status === 'active'
  );

  const handleAssetToggle = (assetId: string, checked: boolean) => {
    const newSelected = new Set(selectedAssets);
    if (checked) {
      newSelected.add(assetId);
    } else {
      newSelected.delete(assetId);
    }
    setSelectedAssets(newSelected);
  };

  const handleSubmit = async (e: React.FormEvent, saveAndComplete: boolean) => {
    e.preventDefault();

    if (selectedAssets.size === 0) {
      alert('Please select at least one source asset to harvest from');
      return;
    }

    if (!formData.quantityValue || parseFloat(formData.quantityValue) <= 0) {
      alert('Please enter a valid quantity greater than 0');
      return;
    }

    const asset_ids = Array.from(selectedAssets).map(id => parseInt(id));
    const asset_roles: Record<number, string> = {};
    asset_ids.forEach(id => {
      asset_roles[id] = 'source';
    });

    // Determine quantity type based on unit
    const selectedUnitInfo = COMMON_UNITS.find(u => u.value === formData.quantityUnit);
    const quantity_type = selectedUnitInfo?.type || 'count';

    const data: HarvestLogData = {
      name: formData.name,
      timestamp: new Date(formData.timestamp).toISOString(),
      asset_ids,
      asset_roles,
      quantities_attributes: [
        {
          value: parseFloat(formData.quantityValue),
          unit: formData.quantityUnit,
          quantity_type,
        },
      ],
      notes: formData.notes || undefined,
      status: saveAndComplete ? 'done' : 'pending',
    };

    if (formData.useCustomLocation && formData.toLocationId) {
      data.to_location_id = parseInt(formData.toLocationId);
    }

    await onSubmit(data, saveAndComplete);

    // Reset form
    setFormData({
      name: '',
      timestamp: new Date().toISOString().slice(0, 16),
      notes: '',
      quantityValue: '',
      quantityUnit: 'eggs',
      useCustomLocation: false,
      toLocationId: '',
    });
    setSelectedAssets(new Set());
  };

  const renderAssetGroup = (assets: Asset[], groupLabel: string) => {
    if (assets.length === 0) return null;

    return (
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground font-semibold uppercase">
          {groupLabel}
        </Label>
        <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-3">
          {assets.map((asset) => (
            <div key={asset.id} className="flex items-center space-x-2">
              <Checkbox
                id={`asset-${asset.id}`}
                checked={selectedAssets.has(asset.id)}
                onCheckedChange={(checked) => handleAssetToggle(asset.id, checked as boolean)}
              />
              <label
                htmlFor={`asset-${asset.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {asset.attributes.name}
                <span className="text-muted-foreground text-xs ml-2">
                  ({asset.attributes.asset_type} #{asset.id})
                </span>
              </label>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const selectedCount = selectedAssets.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Harvest Log</DialogTitle>
          <DialogDescription>
            Record a harvest from your animals or plants
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Morning egg collection"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timestamp">
              Date & Time <span className="text-destructive">*</span>
            </Label>
            <Input
              id="timestamp"
              type="datetime-local"
              value={formData.timestamp}
              onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>
              Harvested From (Source Assets) <span className="text-destructive">*</span>
            </Label>
            <p className="text-sm text-muted-foreground">
              {selectedCount > 0
                ? `${selectedCount} asset${selectedCount === 1 ? '' : 's'} selected`
                : 'Select animals or plants to harvest from'}
            </p>

            {animalsLoading || plantsLoading ? (
              <div className="text-sm text-muted-foreground">Loading assets...</div>
            ) : (
              <div className="space-y-4">
                {renderAssetGroup(animals, 'Animals')}
                {renderAssetGroup(plants, 'Plants')}
              </div>
            )}

            {!animalsLoading && !plantsLoading && allHarvestableAssets.length === 0 && (
              <div className="text-sm text-muted-foreground p-4 border rounded-md text-center">
                No animals or plants available for harvest. Create some assets first.
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              Harvest Amount <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.quantityValue}
                  onChange={(e) =>
                    setFormData({ ...formData, quantityValue: e.target.value })
                  }
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <Select
                  value={formData.quantityUnit}
                  onValueChange={(value) =>
                    setFormData({ ...formData, quantityUnit: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eggs">Eggs</SelectItem>
                    <SelectItem value="dozen">Dozen</SelectItem>
                    <SelectItem value="liters">Liters</SelectItem>
                    <SelectItem value="gallons">Gallons</SelectItem>
                    <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                    <SelectItem value="kg">Kilograms (kg)</SelectItem>
                    <SelectItem value="bushels">Bushels</SelectItem>
                    <SelectItem value="tons">Tons</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Storage Location (optional)</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use-source-location"
                  checked={!formData.useCustomLocation}
                  onCheckedChange={() =>
                    setFormData({ ...formData, useCustomLocation: false, toLocationId: '' })
                  }
                />
                <label
                  htmlFor="use-source-location"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Use source asset location (default)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use-custom-location"
                  checked={formData.useCustomLocation}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, useCustomLocation: checked as boolean })
                  }
                />
                <label
                  htmlFor="use-custom-location"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Store at specific location
                </label>
              </div>

              {formData.useCustomLocation && (
                <Select
                  value={formData.toLocationId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, toLocationId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select storage location..." />
                  </SelectTrigger>
                  <SelectContent>
                    {locationsLoading ? (
                      <SelectItem value="loading" disabled>
                        Loading locations...
                      </SelectItem>
                    ) : (
                      locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.attributes.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this harvest..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={(e) => handleSubmit(e, false)}
              disabled={isPending}
            >
              Save as Pending
            </Button>
            <Button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={isPending}
            >
              {isPending ? 'Saving...' : 'Save & Complete'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

