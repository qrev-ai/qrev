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

export const getAllCampaignsProspects = async (accountId, sequenceId) => {
  try {
    const response = await api.get(
      `/api/campaign/sequence/prospects?account_id=${accountId}&sequence_id=${sequenceId}`,
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

export const campaignSenderList = async (accountId, payload) => {
  try {
    const response = await api.post(
      `/api/campaign/config/senders?account_id=${accountId}`,
      payload,
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

export const getAllCampaignSequencesEmails = async (accountId, pageNum = 1, limit = 20) => {
  try {
    const response = await api.get(
      `/api/campaign/sequence/all/emails?account_id=${accountId}&page_num=${pageNum}&limit=${limit}`,
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
