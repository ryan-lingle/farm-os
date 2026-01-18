import { Wheat } from 'lucide-react';
import { GenericLogPage } from '@/components/GenericLogPage';

const HARVEST_UNITS = [
  'lbs',
  'kg',
  'oz',
  'g',
  'bushels',
  'gallons',
  'liters',
  'count',
  'dozen',
  'bunches',
  'heads',
  'crates',
  'flats',
];

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
      unitOptions={HARVEST_UNITS}
      singleAssetSource={true}
      assetSourceLabel="Harvest From"
    />
  );
};

export default Harvest;
