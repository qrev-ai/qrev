import api from '../config/axios.interceptor';

export const setMyConfiguration = async (accountId, payload) => {
  try {
    const response = await api.post(`/api/account/user/config?account_id=${accountId}`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return Promise.resolve(response.data);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const getMyConfiguration = async (accountId) => {
  try {
    const response = await api.get(`/api/account/user/config?account_id=${accountId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return Promise.resolve(response.data);
  } catch (err) {
    return Promise.reject(err);
  }
};
