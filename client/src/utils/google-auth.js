import axios from 'axios';
import { v4 as uuid } from 'uuid';
import { GOOGLE_CLIENT_ID, base_api_url, qrev_backend_host_url } from '../config/credential';
import api from '../config/axios.interceptor';

const GOOGLE_REDIRECT_URI = `${qrev_backend_host_url}/api/google/auth/code/to/tokens`;
const GOOGLE_AUTHORIZATION_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

export function googleExternalSignInWithBrowser(stateVal) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const qs = require('qs');

  const stateValue = stateVal || uuid();

  const urlParams = {
    client_id: GOOGLE_CLIENT_ID,
    response_type: 'code', //
    access_type: 'offline',
    redirect_uri: GOOGLE_REDIRECT_URI,
    state: `${stateValue}#NATfalse`,
    include_granted_scopes: true,
    prompt: 'consent',
    scope:
      'openid profile email https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly',
  };
  const authUrl = `${GOOGLE_AUTHORIZATION_URL}?${qs.stringify(urlParams)}`;

  return {
    stateValue,
    authUrl,
  };
}

export const signoutGoogle = async (idToken) => {
  const SIGN_OUT_URL = `${base_api_url}/api/v2/gcal/tokens/del`;

  const data = {
    id_token: idToken,
  };
  const response = await axios.post(SIGN_OUT_URL, data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return Promise.resolve(response.data);
};

export const getExchangeToken = async (state, accountType) => {
  const url = `${qrev_backend_host_url}/api/auth/ex/tokens`;

  const data = {
    state,
    accountType,
  };

  try {
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return Promise.resolve(response.data);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const getUserDetails = async (accessToken) => {
  const url = `${qrev_backend_host_url}/api/user/details`;

  try {
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return Promise.resolve(response.data);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const createWorkspaceAccount = async (accountName, accountDomain) => {
  const payload = {
    name: accountName,
    domain: accountDomain,
  };

  try {
    const response = await api.post('/api/account/create', payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return Promise.resolve(response.data);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const getWorkspaceAccounts = async () => {
  try {
    const response = await api.get('/api/user/accounts/list', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return Promise.resolve(response.data);
  } catch (err) {
    return Promise.reject(err);
  }
};
