import { Wheat } from 'lucide-react';
import { GenericLogPage } from '@/components/GenericLogPage';

const Harvest = () => {
  return (
    <GenericLogPage
      logType="harvest"
      title="Harvest"
      titlePlural="Harvests"
      description="Track crop yields, egg collection, and other farm products"
      icon={Wheat}
      iconColor="text-amber-600"
      showQuantity={true}
      quantityLabel="Amount Harvested"
      defaultUnit="lbs"
    />
  );
};

export default Harvest;
