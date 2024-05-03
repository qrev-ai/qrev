import axios from 'axios';
import { qrev_backend_host_url } from './credential';

const api = axios.create({
  baseURL: qrev_backend_host_url,
});

async function refreshAccessToken(refreshToken) {
  try {
    const response = await axios.post(`${qrev_backend_host_url}/api/auth/refresh`, {
      refreshToken,
    });

    let newAccessToken = '';
    if (
      response.data.result &&
      response.data.result.accessToken &&
      response.data.result.expiryInDate
    ) {
      newAccessToken = response.data.result.accessToken;
      localStorage.setItem('accessToken', newAccessToken);
      localStorage.setItem('expiryInDate', response.data.result.expiryInDate);
    } else {
      document.dispatchEvent(new Event('clearDataEvent'));
    }

    return newAccessToken;
  } catch (error) {
    document.dispatchEvent(new Event('clearDataEvent'));
    throw error;
  }
}

api.interceptors.request.use(async (config) => {
  let accessToken = localStorage.getItem('accessToken') || '';

  const cntTimeStamp = new Date().getTime();
  const expiryInDateString = localStorage.getItem('expiryInDate') || '0';
  const expiryInDate = parseInt(expiryInDateString, 10);
  const refreshToken = localStorage.getItem('refreshToken') || '';

  if (expiryInDate <= cntTimeStamp - 1000 && refreshToken) {
    accessToken = await refreshAccessToken(refreshToken);
  }

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (
      error.response.status === 400 ||
      error.response.status === 401 ||
      error.response.status === 498
    ) {
      try {
        const refreshToken = localStorage.getItem('refreshToken') || '';
        const newAccessToken = await refreshAccessToken(refreshToken);

        error.config.headers.Authorization = `Bearer ${newAccessToken}`;

        return axios.request(error.config);
      } catch (refreshError) {
        throw refreshError;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
