export type LoaderType =
  | 'blank'
  | 'bubbles'
  | 'balls'
  | 'bars'
  | 'cubes'
  | 'cylon'
  | 'spin'
  | 'spinningBubbles'
  | 'spokes';

export type AccountType = 'google' | 'outlook';

export type DeviceType = 'web' | 'mob';

export type ThemeType = 'light' | 'dark';

export type PlacementType =
  | 'left'
  | 'top'
  | 'right'
  | 'bottom'
  | 'bottom-end'
  | 'bottom-start'
  | 'left-end'
  | 'left-start'
  | 'right-end'
  | 'right-start'
  | 'top-end'
  | 'top-start'
  | undefined;

export type LinkType = 'openlink' | 'robinlink' | 'collectivelink';

export type LinkShortType = 'ol' | 'rr' | 'cl';

export type ExtraQuestionType =
  | 'phone_number'
  | 'company_name'
  | 'company_url'
  | 'monitor_analytics'
  | 'tags'
  | 'event_description'
  | 'custom_questions'
  | 'custom_note'
  | 'confirmation_redirect_url'
  | 'calendar_event_title'
  | 'dont_reassign_owner_in_crm';

export type ConferenceType = 'google' | 'outlook' | 'zoom' | 'other' | 'in_person';

export type CustomQuestionType =
  | 'email'
  | 'single'
  | 'dropdown'
  | 'phone_number'
  | 'radio_button'
  | 'paragraph_long_answer'
  | 'first_name'
  | 'last_name'
  | 'checkbox'
  | 'booleancheckbox'
  | 'number'
  | 'date'
  | 'gdpr'
  | 'advanced_question'
  | 'region'
  | 'region_country'
  | 'location'
  | '';

export type CRMType = 'salesforce' | 'hubspot';

export type CustomButtonType =
  | 'primary'
  | 'success'
  | 'error'
  | 'semantics'
  | 'accent'
  | 'filled_primary';

export type TimeRangeType = 'all_time' | 'other';

export type DashboardPageBreadType =
  | 'Dashboard'
  | 'Engagement'
  | 'Qualified Leads'
  | 'Disqualified Leads'
  | 'Bookings'
  | 'Team Overview'
  | '';

export type UsersTeamsType = 'user' | 'team';

export type InviteStatusType = 'accepted' | 'pending';

export type TeamMemberRoleType = 'admin' | 'member';

export type TeamMemberObserverType = 'no' | 'yes';

export interface AllyPropsParams {
  id: string;
  'aria-controls': string;
}

export type AlignmentType = 'center' | 'left' | 'right';

export type BookingStatusType = 'confirmed' | 'cancelled' | 'rescheduled' | 'booked' | 'no_show';

export type SeniorityType = 'executive' | 'director' | 'manager';

export type IcpRoleType =
  | 'communications'
  | 'customer_service'
  | 'education'
  | 'engineering'
  | 'finance'
  | 'health_professional'
  | 'human_resources'
  | 'information_technology'
  | 'leadership'
  | 'legal'
  | 'marketing'
  | 'operations'
  | 'product'
  | 'public_relations'
  | 'real_estate'
  | 'recruiting'
  | 'research'
  | 'sales';
