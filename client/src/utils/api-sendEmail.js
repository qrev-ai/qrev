import api from '../config/axios.interceptor';

export const onSendMail = async (payload) => {
  try {
    const response = await api.post(`/api/rev/mail`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return Promise.resolve(response.data);
  } catch (err) {
    return Promise.reject(err);
  }
};
