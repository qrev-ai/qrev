import { UsersTeamsType } from './enums';
import { SelectParams } from './campaigns';

export interface ChatContentParams {
  type: 'text' | 'icon';
  text: string;
}

export interface ChatParams {
  time: number;
  text: string;
  contents: ChatContentParams[];
  message_id: string;
  type: 'track_chatbot' | 'user' | 'rep';
}

export interface LocationParams {
  city: string;
  state: string;
  continent: string;
  country: string;
}

export interface UtmParams {
  utm_campaign: string;
  utm_medium: string;
  utm_source: string;
  utm_term: string;
  utm_content: string;
}

export interface ChatConnectParams {
  created_on: number;
  updated_on: number;
  user_ip_address: string;
  user_location: LocationParams;
  connection_id: string;
  user_timezone: string;
  fbclid: string;
  gclid: string;
  utm: UtmParams;
  page_url: string;
}

export interface ChatbotParams {
  chats: ChatParams[];
  latest_connection_id: string;
  organisation_id: string;
  session_id: string;
  connections: ChatConnectParams[];
  updated_on: number;
  created_on: number;
  id: string;
  account_id?: string;
}

export interface ChatAssignedRefParams {
  email: string;
  name: string;
  status: boolean;
}

export interface ChatbotItemStatusParams {
  assigned_rep: ChatAssignedRefParams;
  docId: string;
  status: boolean;
}

export interface ChatbotsStatusParams {
  [id: string]: ChatbotItemStatusParams;
}

export interface ChatbotSidePanelParams {
  show: boolean;
  details: ChatbotParams;
}

export interface ChatbotTrainParams {
  _id: string;
  organisation_id: string;
  from_id: string;
  chatbot_name: string;
  website_url: string;
  connected_form_uuid: string;
  created_on: string;
  updated_on: string;
  __v: number;
}

export interface ChatbotTrainResponseParams {
  chatbot: ChatbotTrainParams;
  message: string;
  success: boolean;
}

export interface VisitorExperienceRowParams {
  chatbot_experience_id?: string;
  name: string;
  active_pages: {
    type: 'some' | 'all';
    value?: string[];
  };
  chatbot_route: string;
  chatbot_route_name: string;
  index: number;
  active_status: boolean;
}

/* routing-builder */
export interface DefaultOwnershipParams {
  status: boolean;
  ownership_queue: string;
}

export interface RoutingBuilderQuestionParams {
  question_type: string;
  question: string;
  operator: string;
  answers: string[];
}

export interface RoutingBuilderConditionalQuestionsParams {
  questions: RoutingBuilderQuestionParams[];
}

export interface RoutingBuilderToParams {
  type: string;
  value: {
    type: string;
    id: string;
  };
}

export interface RoutingBuilderRulesParams {
  routeTo: RoutingBuilderToParams;
  conditionalQuestions: RoutingBuilderConditionalQuestionsParams[];
}

export interface RoutingBuildCustomRulesParams {
  status: boolean;
  rules: RoutingBuilderRulesParams[];
}

export interface RoutingBuilderParams {
  chatbot_route_id: string;
  name: string;
  default_ownership: DefaultOwnershipParams;
  custom_rules: RoutingBuildCustomRulesParams;
  fallback: {
    status: boolean;
    routeTo: {
      type: string;
      value: string;
    };
  };
}

export interface UserTeamSelectParams extends SelectParams {
  type: UsersTeamsType;
}

export interface WhenOptionSelectParams extends SelectParams {
  question_type: string;
}
