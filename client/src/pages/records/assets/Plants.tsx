import { Sprout } from 'lucide-react';
import { GenericAssetPage } from '@/components/GenericAssetPage';

const Plants = () => {
  return (
    <GenericAssetPage
      assetType="plant"
      title="Plant"
      titlePlural="Plants"
      description="Manage your crop beds, plantings, and vegetation groups"
      icon={Sprout}
      iconColor="text-green-600"
      quantityLabel="plants"
    />
  );
};

export default Plants;
