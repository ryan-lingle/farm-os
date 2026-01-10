import { Tractor } from 'lucide-react';
import { GenericAssetPage } from '@/components/GenericAssetPage';

const Equipment = () => {
  return (
    <GenericAssetPage
      assetType="equipment"
      title="Equipment"
      titlePlural="Equipment"
      description="Manage your farm tools, machinery, and equipment"
      icon={Tractor}
      iconColor="text-blue-600"
      quantityLabel="items"
    />
  );
};

export default Equipment;
