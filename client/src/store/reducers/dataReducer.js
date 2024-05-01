import { cloneDeep } from 'lodash';
import {
  SET_DATA_QUEUES,
  SET_DATA_OPENLINKS,
  SET_DATA_ROBINLINKS,
  SET_DATA_COLLECTIVELINKS,
  SET_DATA_ROUTINGS,
  SET_ACTIVE_ROUTING,
  SET_DATA_CHATBOTS,
  SET_DATA_CHATBOT_EXPERIENCES,
  SET_DATA_ACCOUNT_USERS,
  SET_DATA_ACCOUNT_TEAMS,
  SET_DATA_ROUTING_BUILDERS,
  SET_DATA_MY_CONFIGURATION,
  SET_DATA_ANALYTICS_DATA,
  SET_DATA_QUALIFIED,
  SET_DATA_DISQUALIFIED,
  SET_DATA_LINKS_SUMMARY,
  CLEAR_DATA_REDUCER,
} from '../types';
import { initialState, dataInitialState } from '../storeUtils';

/**
 * This reducer will do all functions related to user creation, clearing
 *
 * @param {*} state local state
 * @param {*} action action type insisted on dispatch
 */
const dataReducer = (state = initialState.data, action) => {
  switch (action.type) {
    case SET_DATA_QUEUES: {
      return {
        ...state,
        queues: cloneDeep(action.payload.queues),
      };
    }

    case SET_DATA_OPENLINKS: {
      return {
        ...state,
        openlinks: cloneDeep(action.payload.links),
      };
    }

    case SET_DATA_ROBINLINKS: {
      return {
        ...state,
        robinlinks: cloneDeep(action.payload.links),
      };
    }

    case SET_DATA_COLLECTIVELINKS: {
      return {
        ...state,
        collectivelinks: cloneDeep(action.payload.links),
      };
    }

    case SET_DATA_ROUTINGS: {
      return {
        ...state,
        routings: cloneDeep(action.payload.routings),
      };
    }

    case SET_ACTIVE_ROUTING: {
      return {
        ...state,
        activeRouting: action.payload.activeRouting,
      };
    }

    case SET_DATA_CHATBOTS: {
      return {
        ...state,
        chatbots: cloneDeep(action.payload.chatbots),
      };
    }

    case SET_DATA_CHATBOT_EXPERIENCES: {
      return {
        ...state,
        chatbotExperiences: cloneDeep(action.payload.chatbotExperiences),
      };
    }

    case SET_DATA_ACCOUNT_USERS: {
      return {
        ...state,
        accountUsers: cloneDeep(action.payload.accountUsers),
      };
    }

    case SET_DATA_ACCOUNT_TEAMS: {
      return {
        ...state,
        accountTeams: cloneDeep(action.payload.accountTeams),
      };
    }

    case SET_DATA_ROUTING_BUILDERS: {
      return {
        ...state,
        routingBuilders: cloneDeep(action.payload.routingBuilders),
      };
    }

    case SET_DATA_MY_CONFIGURATION: {
      return {
        ...state,
        configuration: cloneDeep(action.payload.configuration),
      };
    }

    case SET_DATA_ANALYTICS_DATA: {
      return {
        ...state,
        analyticsData: cloneDeep(action.payload.analyticsData),
      };
    }

    case SET_DATA_QUALIFIED: {
      return {
        ...state,
        qualified: cloneDeep(action.payload.qualified),
      };
    }

    case SET_DATA_DISQUALIFIED: {
      return {
        ...state,
        disqualified: cloneDeep(action.payload.disqualified),
      };
    }

    case SET_DATA_LINKS_SUMMARY: {
      return {
        ...state,
        linksSummary: cloneDeep(action.payload.linksSummary),
      };
    }

    case SET_DATA_LINKS_SUMMARY: {
      return {
        ...state,
        messageTemplates: cloneDeep(action.payload.messageTemplates),
      };
    }

    case CLEAR_DATA_REDUCER: {
      return dataInitialState;
    }

    default: {
      return state;
    }
  }
};

export default dataReducer;
