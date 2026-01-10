import { Users } from 'lucide-react';
import { GenericAssetPage } from '@/components/GenericAssetPage';

const Animals = () => {
  return (
    <GenericAssetPage
      assetType="animal"
      title="Animal Group"
      titlePlural="Animals"
      description="Manage your livestock groups (flocks, herds, etc.)"
      icon={Users}
      iconColor="text-orange-600"
      quantityLabel="animals"
    />
  );
};

export default Animals;
