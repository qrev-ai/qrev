import api from '../config/axios.interceptor';

export const getAllPeoples = async (accountId) => {
  try {
    const response = await api.get(`/api/crm/contact/all?account_id=${accountId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return Promise.resolve(response.data);
  } catch (err) {
    return Promise.reject(err);
  }
};
