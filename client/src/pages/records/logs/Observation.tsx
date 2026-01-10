import { Eye } from 'lucide-react';
import { GenericLogPage } from '@/components/GenericLogPage';

const Observation = () => {
  return (
    <GenericLogPage
      logType="observation"
      title="Observation"
      titlePlural="Observations"
      description="Record observations about crops, animals, and farm conditions"
      icon={Eye}
      iconColor="text-purple-600"
    />
  );
};

export default Observation;
