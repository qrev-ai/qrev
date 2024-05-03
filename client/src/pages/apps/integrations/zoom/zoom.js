import api from '../../../../config/axios.interceptor';

export const zoom_client_id = 'j9ZB2xb0SmK3rRYz2aCbHg';
export const zoom_redirect_uri = 'https://svx.qrev.ai/api/zoom/redirect';
export const zoom_app_autorize_url = 'https://zoom.us/oauth/authorize';

export async function getZoomConnectStatus(accountId) {
  try {
    const res = await api.get(`/api/zoom/is_connected?account_id=${accountId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return Promise.resolve(res.data);
  } catch (err) {
    return Promise.reject(err);
  }
}

export async function connectZoomAuth(accountId, state) {
  const payload = { state };

  try {
    const res = await api.post(`/api/zoom/connect?account_id=${accountId}`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return Promise.resolve(res.data);
  } catch (err) {
    return Promise.reject(err);
  }
}
