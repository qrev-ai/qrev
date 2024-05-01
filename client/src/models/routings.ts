import { CustomQuestionType, CRMType, AlignmentType } from './enums';
import { SelectParams } from './campaigns';

export interface RoutingCustomQuestionOption {
  value: string;
  label?: string;
}

export interface GDPRContentParam {
  type: 'static_text' | 'booleancheckbox';
  value: string;
  required?: boolean;
  checked?: boolean;
}

export interface RoutingCustomQuestionParam {
  edit_status?: boolean;
  label: string;
  question: string;
  required: boolean;
  type: CustomQuestionType;
  question_uuid?: string;
  allowOnlyWorkEmail?: boolean;
  crm_property_name?: string;
  crm_property_category?: string;
  route_field_owner?: boolean;
  route_field_owner_type?: string;
  /* --- extra below --- */
  answeroptions: RoutingCustomQuestionOption[];
  heading?: string;
  scrollable?: boolean;
  content?: GDPRContentParam[];
  isAdvancedQuestion?: boolean;
}

export interface RoutingFormParams {
  routingTitle: string;
  routingSubTitle?: string;
  showSubtitle?: boolean;
  customQuestions: RoutingCustomQuestionParam[];
  routingFirstName?: string;
  firstNameCrmPropertyName?: string;
  routingLastName?: string;
  lastNameCrmPropertyName?: string;
  is_crm_form?: boolean;
  crm_type?: CRMType;
  route_to_contact_owner?: boolean;
  exclude_owner_emails?: string[];
  ownership_queue_id?: string;
}

export interface RouteToParams {
  type: string;
  value: string;
  htmlValue?: string;
  notify_emails?: string[];
  track_link_embedded?: boolean;
}

export interface ConditionalQuestionsQuestionParams {
  question: string;
  question_uuid?: string;
  operator: string;
  answers: string[];
  type?: CustomQuestionType;
  question_type?: CustomQuestionType;
  answerOptions?: SelectParams[];
  required?: boolean;
  isAdvancedQuestion?: boolean;
  operatorOptions?: SelectParams[];
}

export interface ConditionalQuestionParams {
  questions: ConditionalQuestionsQuestionParams[];
}

export interface RoutesParams {
  id?: string;
  routeTo: RouteToParams;
  conditionalQuestions: ConditionalQuestionParams[];
}

export interface RouteAllCaseParams {
  routeTo: RouteToParams;
  editStatus: boolean;
}

export interface RoutingCustomStyleParams {
  title: {
    color: string;
    fontSize: number;
    centerAligned: boolean;
  };
  subtitle: {
    color: string;
    fontSize: number;
    centerAligned: boolean;
  };
  form: {
    backgroundColor: string;
    borderRadius: number;
    borderColor: string;
    borderSize: number;
  };
  input: {
    borderColor: string;
    textColor: string;
    backgroundColor: string;
    labelColor: string;
    borderRadius: number;
    borderSize: number;
  };
  button: {
    backgroundColor: string;
    color: string;
    borderRadius: number;
    borderColor: string;
    text: string;
    fontSize: number;
    alignment: AlignmentType;
  };
}

export interface MappingDataParams {
  location_key: string;
  destination_value: string;
}

interface MappingDetailsParams {
  location_mapping_id: string;
  location_type: string;
  location_mapping_title: string;
  data: MappingDataParams[];
  status: string;
}
export interface RoutingLocationMappingParams {
  status: 'on' | 'off';
  mapping_details: MappingDetailsParams[];
}

export interface RoutingPayloadParams {
  routingForm: RoutingFormParams;
  routes: RoutesParams[];
  routeAllCase: RouteAllCaseParams;
  custom_styles: RoutingCustomStyleParams;
  advanced_options: boolean;
  location_routing?: RoutingLocationMappingParams;
}

export interface RoutingParams {
  form_id: string;
  account: string;
  created_by: string;
  form_title: string;
  routingForm: RoutingFormParams;
  routes: RoutesParams[];
  routeAllCase: RouteAllCaseParams;
  url: string;
  custom_styles: RoutingCustomStyleParams;
  advanced_options: boolean;
  is_built_with_fields_present?: boolean;
  is_clear_bit_fields_present?: boolean;
  showSplit?: boolean;
  showLabelInside?: boolean;
  connected_ownership_queue_ids?: string[];
  created_on: string;
  updated_on: string;
  __v: number;
  location_routing?: RoutingLocationMappingParams;
}

export interface RoutingsResponseParams {
  success: boolean;
  forms: RoutingParams[];
}

export interface EditRouteParams {
  index: number;
  item: RoutesParams;
}

export interface CSVRowParam {
  [index: number]: string[];
}
export interface SetCSVPayloadParams {
  csv_uuid: string;
  csv_name?: string;
  headers?: string[];
  rows?: any;
  remove?: boolean;
}

export interface TerritoryParams extends SetCSVPayloadParams {
  routeIndex: number;
  condionalIndex: number;
  questionIndex: number;
  answerIndex: number;
  status: string;
}
