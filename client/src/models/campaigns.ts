export interface CampaignViewedFromParams {
  city: string;
  continent: string;
  country: string;
  state: string;
  timezone: string;
}
export interface CampaignTableRowParams {
  _id: string;
  name: string;
  steps: number;
  current_prospects: {
    active: number;
    bounced: number;
  };
  sequence_analytics: {
    contacted: number;
    opened: number;
    clicked: number;
    replied: number;
    booked: number;
  };
  isChecked?: boolean;
}

export interface SidePanelParams {
  show: boolean;
  domain: string;
  details: CampaignTableRowParams;
}

export interface CampaignsTableCheckAllParams {
  [pageNum: string]: { checked: boolean };
}

export interface ViewCampaignsResponseParams {
  is_last_page: boolean;
  message: string;
  num_of_pages: number;
  success: boolean;
  result: CampaignTableRowParams[];
}

export interface CampaignDetailsParams {
  prospect_name: string;
  prospect_email: string;
  prospect_number: string;
  organiser_name: string;
  organiser_email: string;
  meeting_start_time: number;
  booked_on_time: number;
}

export interface CampaignDetailsResponseParams {
  is_last_page: boolean;
  message: string;
  num_of_pages: number;
  success: boolean;
  result: CampaignDetailsParams[];
}

export interface CampaignOverviewResponse {
  name: string;
  step_details: {
    steps: number;
    days: number;
  };
  current_prospects: {
    active: number;
    bounced: number;
  };
  steps: [
    {
      active: true;
      order: number;
      type: string;
      time_of_dispatch: {
        type: string;
        value: { time_value: number; time_unit: string };
      };
      draft_type: string;
      subject: string;
      body: string;
    },
  ];
}

export interface CampaignProspectsResponse {
  headers: {
    _id: {
      label: string;
      type: string;
      hidden?: boolean;
      order: number;
    };
    email: {
      label: string;
      type: string;
      order: number;
      hidden?: boolean;
    };
    name: {
      label: string;
      type: string;
      order: number;
      hidden?: boolean;
    };
    phone_number: {
      label: string;
      type: string;
      order: number;
      hidden?: boolean;
    };
    company_name: {
      label: string;
      type: string;
      order: number;
      hidden?: boolean;
    };
    linkedin_url: {
      label: string;
      type: string;
      order: number;
      hidden?: boolean;
    };
    status: {
      label: string;
      type: string;
      values: string[];
      order: number;
      hidden?: boolean;
    };
  };
  data: [
    {
      _id: string;
      email: string;
      name: string;
      phone_number: string;
      company_name: string;
      linkedin_url: string;
      status: string;
    }[],
  ];
}

export interface SelectParams {
  label: string;
  value: string;
}

export interface CollectiveTeamMemberParams {
  email: string;
  main_assignee: boolean;
  optional: boolean;
  member_name?: string;
}

export interface RobinTeamMemberParams {
  member_email: string;
  timezone: SelectParams;
  member_weight: number;
  member_user_id?: string;
  member_max_bookings_per_day: string;
}
