import { Building2 } from 'lucide-react';
import { GenericAssetPage } from '@/components/GenericAssetPage';

const Infrastructure = () => {
  return (
    <GenericAssetPage
      assetType="structure"
      title="Infrastructure"
      titlePlural="Infrastructure"
      description="Manage barns, greenhouses, fences, and other farm structures"
      icon={Building2}
      iconColor="text-slate-600"
      quantityLabel="structures"
    />
  );
};

export default Infrastructure;
