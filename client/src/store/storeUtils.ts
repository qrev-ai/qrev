import {
  DashboardLinkSummaryRowParams,
  DashboardViewParams,
  StoreDisQualifiedViewParams,
  StoreQualifiedViewParams,
} from '../models/dashboard';
import { ConfigurationParams } from '../models/settings';
import {
  UserOrgInfoParams,
  UserParams,
  StoreParams,
  DeviceInfoParams,
  AppIntegrationsParams,
  ConfigParams,
  WorkspaceAccountParams,
  DataStoreParams,
} from '../models/store';

export const init_analytics_data = {
  inbound_form_summary: {
    total_form_visits: 0,
    submitted: 0,
    incomplete: 0,
    booked: 0,
    cancelled: 0,
    rescheduled: 0,
    not_booked: 0,
    meetings_converted: 0,
    disqualified_leads: 0,
  },
  overall_data: {
    calls_booked: 0,
    link_calls: 0,
    form_calls: 0,
    completed: 0,
    cancelled: 0,
    rescheduled: 0,
  },
  link_summary: {
    links_opened: 0,
    booked: 0,
    cancelled: 0,
    rescheduled: 0,
  },
  team_booking_overview: [],
} as DashboardViewParams;

export const init_qualified = {
  percentage: '-',
  headers: {},
  result: [],
} as StoreQualifiedViewParams;

export const init_disqualified = {
  percentage: '-',
  headers: {},
  result: [],
} as StoreDisQualifiedViewParams;

export const initUserOrgInfo: UserOrgInfoParams = {
  part_of_org: false,
  organisation_id: '',
  access_info: {
    inbound_insights: [],
    inbound_insights_alerts: [],
    chatbot: [],
    icp: [],
  },
};

export const userInitialState: UserParams = {
  isSignedIn: false,
  primaryEmail: '',
  defaultEmail: '',
  activeEmails: [],
  accounts: {},
  isAzure: false,
  user_id: '',
  device_info: {} as DeviceInfoParams,
  user_org_info: {
    data: initUserOrgInfo,
    called: false,
    status: false,
  },
  tokens: {
    accessToken: '',
    expiryInDate: -1,
    refreshToken: '',
  },
  workspace: {
    accounts: [] as WorkspaceAccountParams[],
    showCreateModal: false,
    cnt_account_id: '',
  },
  allowDevFeatures: false,
};

export const initialIntegrations = {
  hubspot: {
    logged_in: false,
    state: '',
    is_called: false,
  },
  salesforce: {
    logged_in: false,
    state: '',
    is_called: false,
  },
  zoho: {
    logged_in: false,
    state: '',
    is_called: false,
  },
  zoom: {
    logged_in: false,
    state: '',
    is_called: false,
  },
} as AppIntegrationsParams;

export const configInitialState: ConfigParams = {
  theme: 'light',
  loading: false,
  showSwitchAccounts: false,
};

export const initConf: ConfigurationParams = {
  timezone: '',
  working_start_window_hour: '',
  working_end_window_hour: '',
  working_custom_hours: {},
  duration: 5,
  buffer_time: 0,
  conference_type: 'google',
  visible_for_days: '',
};

export const dataInitialState: DataStoreParams = {
  queues: [],
  openlinks: [],
  robinlinks: [],
  collectivelinks: [],
  routings: [],
  activeRouting: '',
  chatbots: [],
  chatbotExperiences: [],
  accountUsers: [],
  accountTeams: [],
  routingBuilders: [],
  configuration: initConf,
  analyticsData: init_analytics_data,
  qualified: init_qualified,
  disqualified: init_disqualified,
  linksSummary: [] as DashboardLinkSummaryRowParams[],
};

export const initialState: StoreParams = {
  config: configInitialState,
  user: userInitialState,
  integrations: initialIntegrations,
  data: dataInitialState,
};
