import _ from 'lodash';
import {
  ADD_ACCOUNT,
  UPDATE_GOOGLE_CALENDAR_SYNC_TOKEN,
  UPDATE_TRIAL_EXPIRY,
  SWITCH_ACCOUNT,
  UPDATE_GOOGLE_TOKEN,
  UPDATE_ACTIVE_EMAILS,
  UPDATE_DEVICE_INFO,
  SET_USER_ORG_INFO,
  SET_USER_TOKENS,
  SET_USER_WORKSPACE,
  CLEAR_USER_REDUCER,
  SET_DEV_FEATURE,
} from '../types';
import { initialState, userInitialState } from '../storeUtils';

// reducer function
/**
 * This reducer will do all functions related to user creation, clearing
 *
 * @param {*} state local state
 * @param {*} action action type insisted on dispatch
 */
const userReducer = (state = initialState.user, action) => {
  switch (action.type) {
    case UPDATE_ACTIVE_EMAILS: {
      const newActiveEmails = [];
      const payActiveEmails = action.payload.activeEmails || [];
      if (payActiveEmails.includes(state.primaryEmail)) {
        newActiveEmails.push(state.primaryEmail);
      }
      payActiveEmails.forEach((email) => {
        if (email !== state.primaryEmail) {
          newActiveEmails.push(email);
        }
      });
      return {
        ...state,
        activeEmails: newActiveEmails,
      };
    }

    case ADD_ACCOUNT: {
      let data = {
        isSignedIn: action.payload.isSignedIn,
        defaultEmail: action.payload.email,
        accounts: {
          ...state.accounts,
          [action.payload.email]: action.payload.account,
        },
      };

      if (action.payload.account.isPrimary) {
        data = {
          ...data,
          primaryEmail: action.payload.email,
          activeEmails: [action.payload.email],
          isAzure: action.payload.isAzure,
        };
      } else {
        data = {
          ...data,
          activeEmails: [...state.activeEmails, action.payload.email],
        };
      }

      return {
        ...state,
        ...data,
      };
    }

    case UPDATE_GOOGLE_CALENDAR_SYNC_TOKEN: {
      return {
        ...state,
        accounts: {
          ...state.accounts,
          [action.payload.email]: {
            ...state.accounts[action.payload.email],
            syncToken: action.payload.nextSyncToken,
          },
        },
      };
    }

    case UPDATE_GOOGLE_TOKEN: {
      return {
        ...state,
        accounts: {
          ...state.accounts,
          [action.payload.email]: {
            ...state.accounts[action.payload.email],
            accessToken: action.payload.accessToken,
            expiry: action.payload.expiry,
          },
        },
      };
    }

    case UPDATE_TRIAL_EXPIRY: {
      return {
        ...state,
        accounts: {
          ...state.accounts,
          [action.payload.email]: {
            ...state.accounts[action.payload.email],
            trial_expiry: action.payload.trial_expiry,
          },
        },
      };
    }

    case SWITCH_ACCOUNT: {
      return {
        ...state,
        defaultEmail: action.payload.email,
      };
    }

    case UPDATE_DEVICE_INFO: {
      return { ...state, device_info: action.payload };
    }

    case SET_USER_ORG_INFO: {
      return {
        ...state,
        user_org_info: _.cloneDeep(action.payload),
      };
    }

    case SET_USER_TOKENS: {
      return {
        ...state,
        tokens: _.cloneDeep(action.payload),
      };
    }

    case SET_USER_WORKSPACE: {
      return {
        ...state,
        workspace: _.cloneDeep(action.payload),
      };
    }

    case CLEAR_USER_REDUCER: {
      return userInitialState;
    }

    case SET_DEV_FEATURE: {
      return {
        ...state,
        allowDevFeatures: _.cloneDeep(action.payload),
      };
    }

    default: {
      return state;
    }
  }
};

export default userReducer;
