import { SET_LOADING, SET_SHOW_SWITCH_ACCOUNTS } from './types';

interface SetStoreLoadingParams {
  type: string;
  payload: { loading: boolean };
}

export const setStoreLoading = (loading: boolean): SetStoreLoadingParams => ({
  type: SET_LOADING,
  payload: { loading },
});

interface SetShowSwitchAccountsParams {
  type: string;
  payload: { showSwitchAccounts: boolean };
}

export const setShowSwitchAccounts = (
  showSwitchAccounts: boolean,
): SetShowSwitchAccountsParams => ({
  type: SET_SHOW_SWITCH_ACCOUNTS,
  payload: { showSwitchAccounts },
});
