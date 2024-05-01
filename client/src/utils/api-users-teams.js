import api from '../config/axios.interceptor';

export const addUsersToAccount = async (accountId, payload) => {
  try {
    const response = await api.post(`/api/account/users/invite?account_id=${accountId}`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return Promise.resolve(response.data);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const removeUserFromAccount = async (accountId, payload) => {
  try {
    const response = await api.post(`/api/account/users/remove?account_id=${accountId}`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return Promise.resolve(response.data);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const viewAccountUsers = async (accountId) => {
  try {
    const response = await api.get(`/api/account/users/list?account_id=${accountId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return Promise.resolve(response.data);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const createTeam = async (accountId, payload) => {
  try {
    const response = await api.post(`/api/team/create?account_id=${accountId}`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return Promise.resolve(response.data);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const updateTeam = async (accountId, teamId, payload) => {
  try {
    const response = await api.post(
      `/api/team/update?account_id=${accountId}&team_id=${teamId}`,
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

export const deleteTeam = async (accountId, teamId) => {
  try {
    const response = await api.post(
      `/api/team/delete?account_id=${accountId}&team_id=${teamId}`,
      {},
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

export const viewAllTeams = async (accountId) => {
  try {
    const response = await api.get(`/api/team/list?account_id=${accountId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return Promise.resolve(response.data);
  } catch (err) {
    return Promise.reject(err);
  }
};
