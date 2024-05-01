import { UtmParams } from './chatbots';
import { TimeRangeType, DashboardPageBreadType, LinkShortType, BookingStatusType } from './enums';

export interface InboundFormSummaryParams {
  total_form_visits: number;
  submitted: number;
  incomplete: number;
  booked: number;
  cancelled: number;
  rescheduled: number;
  not_booked: number;
  meetings_converted: number;
  disqualified_leads: number;
}

export interface OverallDataParams {
  calls_booked: number;
  link_calls: number;
  form_calls: number;
  completed: number;
  cancelled: number;
  rescheduled: number;
}

export interface LinkSummaryParams {
  links_opened: number;
  booked: number;
  cancelled: number;
  rescheduled: number;
}

export interface TeamBookOverviewItemParams {
  email: string;
  name: string;
  count: number;
}

export interface DashboardViewParams {
  inbound_form_summary: InboundFormSummaryParams;
  overall_data: OverallDataParams;
  link_summary: LinkSummaryParams;
  team_booking_overview: TeamBookOverviewItemParams[];
}

export interface DashboardViewResponseParams {
  success: boolean;
  message: string;
  result: DashboardViewParams;
}

export interface TimeRangeValueParams {
  start: number;
  end: number;
}

export interface TimeRangeParams {
  label?: string;
  type: TimeRangeType;
  value: TimeRangeValueParams;
}

export interface TeamParams {
  team_id: string;
  label: string;
  email: string;
}

export interface DashboardPageBredcrumbParams {
  previous: DashboardPageBreadType;
  current: DashboardPageBreadType;
}

export interface EngagementTableStatusParams {
  name: string;
  color: string;
  bgCol: string;
}

export interface EngagementTableRowParams {
  name: string;
  email: string;
  phone_number: string;
  date: string;
  status: EngagementTableStatusParams[];
  remarks: string;
  id: number;
}

export interface AnalyticsFetchPayloadParams {
  query_type: string; // time_of_analytic
  time_range: {
    type: TimeRangeType;
    value?: TimeRangeValueParams;
  };
}

export interface LinkBookingViewPayloadParams extends AnalyticsFetchPayloadParams {
  link_id: string;
  utm: UtmParams;
  type_of_link: LinkShortType;
}

export interface QualifiedFieldHeaderParams {
  label: string;
  field_type: string;
  order: number;
  default?: boolean;
}

export interface QualifiedResHeaderParams {
  [headKey: string]: QualifiedFieldHeaderParams;
}

export interface QualifiedRowParams {
  name: string;
  email: string;
  phone_number: string;
  date_time: string;
  status: string;
  booking_owner: string;
  remarks: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
}

export interface DisQualifiedRowParams {
  name: string;
  email: string;
  phone_number: string;
  date_time: string;
  disq_criteria: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
}

export interface StoreQualifiedViewParams {
  percentage: string;
  headers: QualifiedResHeaderParams;
  result: QualifiedRowParams[];
}

export interface QualifiedViewResponseParams extends StoreQualifiedViewParams {
  success: boolean;
  message?: string;
  txid?: string;
}

export interface StoreDisQualifiedViewParams {
  percentage: string;
  headers: QualifiedResHeaderParams;
  result: DisQualifiedRowParams[];
}

export interface DisQualifiedViewResponseParams extends StoreDisQualifiedViewParams {
  success: boolean;
  message?: string;
  txid?: string;
}

export interface LinkBookingRowParams {
  attendee_email: string;
  attendee_full_name: string;
  attendee_phone_no: string;
  organiser_email: string;
  organiser_name: string;
  booked_on_millis: number;
  booking_start_millis: number;
  booking_end_millis: number;
  meeting_notes: string;
  status: BookingStatusType;
  attendee_company_name: string;
  attendee_company_url: string;
}

export interface StoreLinkBookingViewParams {
  headers: QualifiedResHeaderParams;
  result: LinkBookingRowParams[];
}

export interface LinkBookingViewResponseParams extends StoreLinkBookingViewParams {
  success: boolean;
  message?: string;
  txid?: string;
}

export interface AggregatedAnalyticsDataParams {
  total_opened: number;
  unique_opened: number;
  slot_selected: number;
  booked: number;
  cancelled: number;
  rescheduled: number;
}
export interface AggregatedAnalyticsParams {
  utm: UtmParams;
  data: AggregatedAnalyticsDataParams;
}
export interface DashboardLinkSummaryRowParams {
  link_id: string;
  title: string;
  type_of_link: LinkShortType;
  utm_aggregated_analytics: AggregatedAnalyticsParams[];
  collapsed?: boolean;
}

export interface DashboardLinkViewResponseParams {
  success: boolean;
  result: DashboardLinkSummaryRowParams[];
  message?: string;
  txid?: string;
}

export interface LinkBookingSelectedParams {
  link_id: string;
  utm: UtmParams;
  type_of_link: LinkShortType;
}
