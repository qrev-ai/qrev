import axios from 'axios';
import { base_api_url } from '../config/credential';

export const getUserOrgInfo = async (payload) => {
  const url = `${base_api_url}/api/v2/organisation/user/info`;

  try {
    const response = await axios.post(url, payload);
    return Promise.resolve(response.data);
  } catch (err) {
    return Promise.reject(err);
  }
};
