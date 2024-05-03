export type SubscribedType =
  | 'calendar'
  | 'scheduling_links'
  | 'lead_routing'
  | 'visitors_insights'
  | 'reporting'
  | 'campaigns'
  | 'chatbot'
  | 'call_insights'
  | 'crm';

export interface SubscribedParams {
  name: string;
  description?: string;
  type: SubscribedType;
  isCommingSoon?: boolean;
  isBuyNow?: boolean;
  isLaunch?: boolean;
  isUpgrade?: boolean;
}

export interface getbtnClassKeyProps {
  isLaunch?: boolean;
  isBuyNow?: boolean;
  isCommingSoon?: boolean;
  isUpgrade?: boolean;
}
