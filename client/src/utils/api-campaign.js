import api from '../config/axios.interceptor';

export const getVisitorCampaignsViews = async (accountId) => {
  try {
    const response = await api.get(`/api/campaign/sequence/all?account_id=${accountId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return Promise.resolve(response.data);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const getCampaignsOverview = async (accountId, sequenceId) => {
  try {
    const response = await api.get(
      `/api/campaign/sequence/?account_id=${accountId}&sequence_id=${sequenceId}`,
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

export const getCampaignsMeetings = async (accountId, sequenceId) => {
  try {
    const response = await api.get(
      `/api/campaign/sequence/meetings?account_id=${accountId}&sequence_id=${sequenceId}`,
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
