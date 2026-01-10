import { Package } from 'lucide-react';
import { GenericLogPage } from '@/components/GenericLogPage';

const Input = () => {
  return (
    <GenericLogPage
      logType="input"
      title="Input"
      titlePlural="Inputs"
      description="Record fertilizers, amendments, feed, and other inputs applied"
      icon={Package}
      iconColor="text-blue-600"
      showQuantity={true}
      quantityLabel="Amount Applied"
      defaultUnit="lbs"
    />
  );
};

export default Input;
