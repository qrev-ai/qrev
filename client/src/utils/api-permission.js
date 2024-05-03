import { qrev_backend_host_url } from '../config/credential';
import api from '../config/axios.interceptor';

export const getDevPermission = async (payload) => {
  const url = `${qrev_backend_host_url}/api/permission/dev_features`;

  try {
    const response = await api.get(url, payload);
    return Promise.resolve(response.data);
  } catch (err) {
    return Promise.reject(err);
  }
};
