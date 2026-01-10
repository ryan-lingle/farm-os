import { Recycle } from 'lucide-react';
import { GenericAssetPage } from '@/components/GenericAssetPage';

const Compost = () => {
  return (
    <GenericAssetPage
      assetType="compost"
      title="Compost"
      titlePlural="Compost"
      description="Manage your compost piles and organic amendments"
      icon={Recycle}
      iconColor="text-amber-600"
      quantityLabel="piles"
    />
  );
};

export default Compost;
