import { DashboardPageBreadType } from '../models/enums';

export const LOGIN_TYPE = {
  google: 'google_login',
  microsoft: 'microsoft_login',
};

export const DASHBOARD_PAGE_BREAD_TYPE = {
  main: 'Dashboard' as DashboardPageBreadType,
  empty: '' as DashboardPageBreadType,
  engagement: 'Engagement' as DashboardPageBreadType,
  qualified: 'Qualified Leads' as DashboardPageBreadType,
  disqualified: 'Disqualified Leads' as DashboardPageBreadType,
  bookings: 'Bookings' as DashboardPageBreadType,
  teamoverview: 'Team Overview' as DashboardPageBreadType,
};

export const ROUTE_TO_TYPES = {
  calendar_event: 'Booking Page',
  custom_link: 'Custom Link',
  custom_message: 'Custom Message',
  teammate: 'Teammate',
  territory_owner: 'Territory Owner',
  ownership_queue: 'Ownership Queue',
};

export const CUSTOM_QUESTION_TYPE = {
  email: 'email',
  single: 'single',
  dropdown: 'dropdown',
  phone_number: 'phone_number',
  radio_button: 'radio_button',
  paragraph_long_answer: 'paragraph_long_answer',
  checkbox: 'checkbox',
  booleancheckbox: 'booleancheckbox',
  number: 'number',
  date: 'date',

  // advanced option:
  advanced_question: 'advanced_question',
  country: 'country',
  alexa_global_rank: 'alexa_global_rank',
  number_of_employees: 'number_of_employees',
  estiated_annual_revenue: 'estiated_annual_revenue',
  tech_category: 'tech_category',
  tech_used: 'tech_used',
  location: 'location',

  // extra option:
  region: 'region',
  region_country: 'region_country',
};
