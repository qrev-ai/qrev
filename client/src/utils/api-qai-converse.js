import api from '../config/axios.interceptor';

export const qaiConverse = async (accountId, payload) => {
  try {
    const response = await api.post(`/api/qai/converse?account_id=${accountId}`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return Promise.resolve(response.data);
  } catch (err) {
    console.log('error', err);
  }
};

export const getAllQaiConverse = async (accountId) => {
  try {
    const response = await api.get(`/api/qai/conversation/all?account_id=${accountId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return Promise.resolve(response.data);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const createQaiConverse = async (accountId) => {
  try {
    const response = await api.post(`/api/qai/conversation/create?account_id=${accountId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return Promise.resolve(response.data);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const getQaiConverseById = async (accountId, conversationId) => {
  try {
    const response = await api.get(
      `/api/qai/conversation?account_id=${accountId}&conversation_id=${conversationId}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    return Promise.resolve(response.data);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const sendCampaign = async (accountId, payload) => {
  try {
    const response = await api.post(`/api/campaign/send?account_id=${accountId}`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return Promise.resolve(response.data);
  } catch (err) {
    return Promise.reject(err);
  }
};
