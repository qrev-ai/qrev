import { SET_THEME, SET_LOADING, SET_SHOW_SWITCH_ACCOUNTS, CLEAR_CONFIG_REDUCER } from '../types';
import { initialState, configInitialState } from '../storeUtils';

/**
 * This reducer will do all functions related to user creation, clearing
 *
 * @param {*} state local state
 * @param {*} action action type insisted on dispatch
 */
const configReducer = (state = initialState.config, action) => {
  switch (action.type) {
    case SET_THEME: {
      return {
        ...state,
        theme: action.payload.theme,
      };
    }

    case SET_LOADING: {
      return {
        ...state,
        loading: action.payload.loading,
      };
    }

    case SET_SHOW_SWITCH_ACCOUNTS: {
      return {
        ...state,
        showSwitchAccounts: action.payload.showSwitchAccounts,
      };
    }

    case CLEAR_CONFIG_REDUCER: {
      return configInitialState;
    }

    default: {
      return state;
    }
  }
};

export default configReducer;
