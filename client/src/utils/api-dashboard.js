import api from '../config/axios.interceptor';

export const getAnalyticsDashboardViews = async (accountId, payload) => {
  try {
    const response = await api.post(
      `/api/analytic/view/dashboard?account_id=${accountId}`,
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

export const getViewQualifiedAnalytics = async (accountId, payload) => {
  try {
    const response = await api.post(
      `/api/analytic/view/qualified?account_id=${accountId}`,
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

export const getViewDisQualifiedAnalytics = async (accountId, payload) => {
  try {
    const response = await api.post(
      `/api/analytic/view/disqualified?account_id=${accountId}`,
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

export const getViewLinkSummaryAnalytics = async (accountId, payload) => {
  try {
    const response = await api.post(
      `/api/analytic/view/links/summary?account_id=${accountId}`,
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

export const getViewLinkBookingAnalytics = async (accountId, payload) => {
  try {
    const response = await api.post(
      `/api/analytic/view/link/bookings?account_id=${accountId}`,
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

export const callDefaultLinkAPI = async (accountId, payload) => {
  try {
    const response = await api.post(
      `/api/link/ol/create/default_link?account_id=${accountId}`,
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
