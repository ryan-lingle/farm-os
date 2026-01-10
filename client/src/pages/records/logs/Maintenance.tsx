import { Wrench } from 'lucide-react';
import { GenericLogPage } from '@/components/GenericLogPage';

const Maintenance = () => {
  return (
    <GenericLogPage
      logType="maintenance"
      title="Maintenance"
      titlePlural="Maintenance"
      description="Track equipment repairs, infrastructure upkeep, and maintenance work"
      icon={Wrench}
      iconColor="text-orange-600"
    />
  );
};

export default Maintenance;
