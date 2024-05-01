import {
  InviteStatusType,
  TeamMemberRoleType,
  TeamMemberObserverType,
  ConferenceType,
} from './enums';

export interface CustomHoursItemParams {
  start: string /* 02:00 pm */;
  end: string /* 05:30 pm */;
}

export interface CustomHoursParams {
  /**
   "fri": [
      {
        "start": "02:00 pm",
        "end": "05:30 pm"
      }
    ],
   */
  [date: string]: CustomHoursItemParams[];
}

export interface QueueRouteParams {
  routeTo: { type: string };
  condition: {
    crm_field: string;
    operator: string;
    value: string;
  };
}

export interface QueueObjectParams {
  queue_name: string;
  routes: QueueRouteParams[];
  exclude_list: string[];
  ownership_queue_id: string;
}

export interface AccountUserParams {
  user_id: string;
  name: string;
  email: string;
  is_super_admin: boolean;
  invite_status: InviteStatusType;
  created_on: string;
  updated_on: string;
}

export interface TeamMemberParams {
  user_id: string;
  name: string;
  email: string;
  role: TeamMemberRoleType;
  observer: TeamMemberObserverType;
}

export interface AccountTeamParams {
  team_id: string;
  name: string;
  members: TeamMemberParams[];
}

export interface ConfigurationParams {
  timezone: string;
  working_start_window_hour: string;
  working_end_window_hour: string;
  working_custom_hours: CustomHoursParams;
  duration: number;
  buffer_time: number;
  conference_type: ConferenceType;
  visible_for_days: string;
}
