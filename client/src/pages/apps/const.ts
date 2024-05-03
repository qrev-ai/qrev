import { CustomButtonType } from '../../models/enums';
import { SubscribedParams, getbtnClassKeyProps } from '../../models/apps';

export const SUBSCRIBED_APPS = [
  {
    name: 'Q-Campaigns',
    description: 'Send outbound campaigns',
    type: 'campaigns',
    isLaunch: true,
  },
  {
    name: 'QRM',
    description: 'Flexible, Modern CRM to manage qualified leads',
    type: 'crm',
    isLaunch: true,
  },
  {
    name: 'Q-Recordings',
    description: 'Analyze calls, get intelligence and actionable insights',
    type: 'call_insights',
    isCommingSoon: true,
  },
] as SubscribedParams[];

export const getAppBtnActionLabel = ({
  isLaunch,
  isBuyNow,
  isCommingSoon,
  isUpgrade,
}: getbtnClassKeyProps): string => {
  if (isLaunch) {
    return 'Launch';
  } else if (isBuyNow) {
    return 'Buy Now';
  } else if (isCommingSoon) {
    return 'Coming Soon';
  } else if (isUpgrade) {
    return 'Upgrade';
  }

  return '';
};

export const getAppButtonType = ({
  isLaunch,
  isBuyNow,
  isCommingSoon,
  isUpgrade,
}: getbtnClassKeyProps): CustomButtonType => {
  if (isLaunch) {
    return 'success';
  } else if (isBuyNow) {
    return 'primary';
  } else if (isCommingSoon) {
    return 'semantics';
  } else if (isUpgrade) {
    return 'error';
  }

  return 'primary';
};
