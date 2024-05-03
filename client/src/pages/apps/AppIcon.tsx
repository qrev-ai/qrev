import React from 'react';
import { SubscribedType } from '../../models/apps';
import loadable from '@loadable/component';
import { BsDatabaseFillGear } from 'react-icons/bs';

const CalendarIcon = loadable(() => import('../../icons/CalendarIcon'));
const CampaignsIcon = loadable(() => import('../../icons/CampaignsIcon'));
const DashboardIcon = loadable(() => import('../../icons/DashboardIcon'));
const CallInsightsIcon = loadable(() => import('../../icons/CallInsightsIcon'));

interface AppIconProps {
  type: SubscribedType;
  fill?: string;
}

const AppIcon = ({ type, fill }: AppIconProps): React.ReactElement => {
  return (
    <React.Fragment>
      {type === 'calendar' && <CalendarIcon width="32px" fill={fill || '#D4D4D6'} />}
      {type === 'reporting' && <DashboardIcon width="32px" fill={fill || '#D4D4D6'} />}
      {type === 'campaigns' && <CampaignsIcon width="32px" fill={fill || '#D4D4D6'} />}
      {type === 'call_insights' && <CallInsightsIcon width="32px" fill={fill || '#D4D4D6'} />}
      {type === 'crm' && <BsDatabaseFillGear size={32} color={fill || '#D4D4D6'} />}
    </React.Fragment>
  );
};

export default AppIcon;
