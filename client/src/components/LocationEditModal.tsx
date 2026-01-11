/**
 * LocationEditModal - Full edit dialog for location properties
 * Allows editing name, description, and parent location
 */

import { useState, useEffect } from 'react';
import { Location } from '@/hooks/useLocations';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ParentSelector } from '@/components/ParentSelector';

interface LocationEditModalProps {
  location: Location | null;
  locations: Location[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: Partial<Location>) => void;
}

export function LocationEditModal({
  location,
  locations,
  open,
  onOpenChange,
  onSave,
}: LocationEditModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync form state when location changes
  useEffect(() => {
    if (location) {
      setName(location.name);
      setDescription(location.description || '');
      setParentId(location.parent_id || null);
    }
  }, [location]);

  const handleSave = async () => {
    if (!location || !name.trim()) return;

    setIsSaving(true);
    try {
      onSave(location.id, {
        name: name.trim(),
        description: description.trim() || null,
        parent_id: parentId,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (!location) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Location</DialogTitle>
          <DialogDescription>
            Update the location details. Click save when you're done.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Location name"
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
            />
          </div>

          {/* Parent Location */}
          <div className="grid gap-2">
            <Label>Parent Location</Label>
            <ParentSelector
              locations={locations}
              selectedId={parentId}
              onSelect={setParentId}
              excludeIds={[Number(location.id)]}
              placeholder="No parent (root location)"
            />
          </div>

          {/* Location Info (read-only) */}
          {location.area_acres !== null && location.area_acres !== undefined && (
            <div className="text-sm text-muted-foreground">
              Area: {location.area_acres.toFixed(2)} acres
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LocationEditModal;
