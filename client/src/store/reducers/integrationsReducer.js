import { cloneDeep } from 'lodash';
import {
  SET_HUBSPOT,
  SET_SALESFORCE,
  SET_ZOHO,
  SET_ZOOM,
  CLEAR_INTEGRATIONS_REDUCER,
} from '../types';
import { initialState, initialIntegrations } from '../storeUtils';

/**
 * This reducer will do all functions related to user creation, clearing
 *
 * @param {*} state local state
 * @param {*} action action type insisted on dispatch
 */
const integrationsReducer = (state = initialState.integrations, action) => {
  switch (action.type) {
    case SET_HUBSPOT: {
      return {
        ...state,
        hubspot: cloneDeep(action.payload),
      };
    }

    case SET_SALESFORCE: {
      return {
        ...state,
        salesforce: cloneDeep(action.payload),
      };
    }

    case SET_ZOHO: {
      return {
        ...state,
        zoho: cloneDeep(action.payload),
      };
    }

    case SET_ZOOM: {
      return {
        ...state,
        zoom: cloneDeep(action.payload),
      };
    }

    case CLEAR_INTEGRATIONS_REDUCER: {
      return initialIntegrations;
    }

    default: {
      return state;
    }
  }
};

export default integrationsReducer;
