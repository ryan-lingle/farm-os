import { Activity as ActivityIcon } from 'lucide-react';
import { GenericLogPage } from '@/components/GenericLogPage';

const Activity = () => {
  return (
    <GenericLogPage
      logType="activity"
      title="Activity"
      titlePlural="Activities"
      description="Log general farm activities and work performed"
      icon={ActivityIcon}
      iconColor="text-green-600"
    />
  );
};

export default Activity;
