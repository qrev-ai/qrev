import { SelectParams } from '../../models/campaigns';

export const whenOptions = [
  { label: 'New event is booked', value: 'new_event_is_booked' },
  { label: 'After event is booked', value: 'after_event_is_booked' },
  { label: 'Before event starts', value: 'before_event_starts' },
  { label: 'After event ends', value: 'after_event_ends' },
] as SelectParams[];

export const typeOptions = [
  { label: 'Email', value: 'email' },
  { label: 'WhatsApp', value: 'whatsapp' },
] as SelectParams[];

export const unitOptions = [
  { label: 'Days', value: 'day' },
  { label: 'Hours', value: 'hour' },
  { label: 'Minutes', value: 'minute' },
  { label: 'Seconds', value: 'second' },
] as SelectParams[];

export const FORM_IDS_LIST: string[] = [
  'tm-title-input',
  'tm-when-select',
  'tm-long-input',
  'tm-unit-select',
  'tm-type-select',
  'tm-subject-input',
  'tm-message-input',
];

export const tabQuery: { [key: number]: string } = {
  0: 'my-settings',
  1: 'ownership-queues',
  2: 'users-teams',
  3: 'message-templates',
};

export const durationOptions = [
  { label: '5' },
  { label: '10' },
  { label: '20' },
  { label: '30' },
  { label: '45' },
  { label: '60' },
].map((v) => ({
  value: v.label,
  label: v.label,
})) as SelectParams[];

export const betweenHoursOptions = [
  { label: '9 am to 5 pm' },
  { label: '8 am to 12 pm' },
  { label: '12 to 5 pm' },
].map((v) => ({
  value: v.label,
  label: v.label,
})) as SelectParams[];

export const bufferUnitOptions = [{ label: 'days' }, { label: 'hours' }, { label: 'minutes' }].map(
  (v) => ({
    value: v.label,
    label: v.label,
  }),
) as SelectParams[];

export const daysIntoFutureOptions = [
  { label: '14' },
  { label: '20' },
  { label: '30' },
  { label: '60' },
].map((v) => ({
  value: v.label,
  label: v.label,
})) as SelectParams[];

export const conferenceOptions = [
  { label: 'Google', value: 'google' },
  { label: 'Zoom', value: 'zoom' },
  { label: 'Other', value: 'other' },
  { label: 'In Person', value: 'in_person' },
] as SelectParams[];

export type MessageTemplateType = {
  _id?: string;
  account: string;
  owner: string;
  template_name: string;
  message_type: string;
  trigger_type: string;
  trigger_time?: {
    value: number;
    unit: string;
  };
  subject?: string;
  body: string;
  created_on?: Date;
  updated_on?: Date;
  __v?: number;
};

export const placeholders: string[] = [
  '/event_name',
  '/organiser_name',
  '/organiser_email',
  '/organiser_tz',
  '/event_start_date',
  '/event_start_time',
  '/event_end_date',
  '/event_end_time',
  '/event_creation_date',
  '/event_creation_time',
  '/attendee_name',
  '/attendee_first_name',
  '/attendee_last_name',
  '/attendee_company_name',
  '/attendee_tz',
  '/event_meeting_url',
  '/event_reschedule_url',
  '/event_cancel_url',
  '/time_left_to_event_start',
];
