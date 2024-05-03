import { AccountType, DeviceType, ThemeType } from './enums';
import {
  QueueObjectParams,
  AccountUserParams,
  AccountTeamParams,
  ConfigurationParams,
} from './settings';
import { RoutingParams } from './routings';
import { ChatbotParams, RoutingBuilderParams, VisitorExperienceRowParams } from './chatbots';
import {
  DashboardLinkSummaryRowParams,
  DashboardViewParams,
  StoreDisQualifiedViewParams,
  StoreQualifiedViewParams,
} from './dashboard';

/**
 * userReducer.js
 */
export interface UserOrgAccessInfoParams {
  inbound_insights: string[];
  inbound_insights_alerts: string[];
  chatbot: string[];
  icp: string[];
}

export interface UserOrgInfoParams {
  part_of_org: boolean;
  organisation_id: string;
  access_info: UserOrgAccessInfoParams;
}

export interface UserAccountParams {
  email: string;
  fullname: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  id: string;
  idToken: string;
  accessToken: string;
  stateValue: string;
  isPrimary: boolean;
  isEnabled: boolean;
  logo: string;
  type: AccountType;
  color: string;
  isAzure: boolean;
  expiry: number;
}

export interface AccountsParams {
  [email: string]: UserAccountParams;
}

export interface WorkspaceAccountParams {
  id: string;
  name: string;
  domain: string;
  isCurrent?: boolean;
}

export interface ExchangeTokenParams {
  accessToken: string;
  expiryInDate: number;
  refreshToken: string;
}

export interface UserParams {
  isSignedIn: boolean;
  primaryEmail: string;
  defaultEmail: string;
  activeEmails: string[];
  accounts: AccountsParams;
  isAzure: boolean;
  user_id: string;
  device_info: DeviceInfoParams;
  user_org_info: { data: UserOrgInfoParams; called: boolean; status: boolean };
  tokens: ExchangeTokenParams;
  workspace: {
    accounts: WorkspaceAccountParams[];
    showCreateModal: boolean;
    cnt_account_id: string;
    flag?: string;
  };
  allowDevFeatures?: boolean;
}

export interface DeviceInfoParams {
  device_id: string;
  device_type: DeviceType;
}

export interface ConfigParams {
  theme: ThemeType;
  loading: boolean;
  showSwitchAccounts: boolean;
}

/**
 * Google & Azure Account Params
 */
export interface GoogleAccountParams {
  uid: string;
  email: string;
  displayName: string;
  idToken: string;
  accessToken: string;
  expiry: number;
  stateValue: string;
  isPrimary: boolean;
  isEnabled: boolean;
  origin: string;
  color: string;
  logo: string;
  googleSyncToken?: string;
}

export interface AzureAccountParams {
  username: string;
  email: string;
  name: string;
  id: string;
  givenName: string;
  surname: string;
  details: {
    idToken: string;
    accessToken: string;
    stateValue: string;
  };
}

/**
 * integrationReducer.js
 */
export interface AppConnectParams {
  logged_in: boolean;
  state: string;
  is_called: boolean;
}

export interface AppIntegrationsParams {
  [appName: string]: AppConnectParams;
}

/**
 * dataReducer.js
 */
export interface DataStoreParams {
  queues: QueueObjectParams[];
  openlinks: any[];
  robinlinks: any[];
  collectivelinks: any[];
  routings: RoutingParams[];
  activeRouting: string;
  chatbots: ChatbotParams[];
  chatbotExperiences: VisitorExperienceRowParams[];
  accountUsers: AccountUserParams[];
  accountTeams: AccountTeamParams[];
  routingBuilders: RoutingBuilderParams[];
  configuration: ConfigurationParams;
  analyticsData: DashboardViewParams;
  qualified: StoreQualifiedViewParams;
  disqualified: StoreDisQualifiedViewParams;
  linksSummary: DashboardLinkSummaryRowParams[];
}

/**
 * main-store structure
 */
export interface StoreParams {
  config: ConfigParams;
  user: UserParams;
  integrations: AppIntegrationsParams;
  data: DataStoreParams;
}
