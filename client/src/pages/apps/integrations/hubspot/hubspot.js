import api from '../../../../config/axios.interceptor';

export const hubspot_client_id = '6ccd858f-82e7-4206-88a8-904d41df0e65';
export const hubspot_redirect_uri = 'https://svx.qrev.ai/api/hubspot/redirect';
export const hubspot_app_autorize_url = 'https://app.hubspot.com/oauth/authorize';

export const hubspot_scopes = [
  'forms',
  'crm.objects.contacts.read',
  'crm.objects.contacts.write',
  'crm.objects.marketing_events.read',
  'crm.objects.marketing_events.write',
  'crm.schemas.custom.read',
  'crm.objects.custom.read',
  'crm.objects.custom.write',
  'crm.objects.companies.write',
  'settings.users.read',
  'crm.schemas.contacts.read',
  'crm.objects.companies.read',
  'crm.schemas.companies.read',
  'crm.schemas.companies.write',
  'crm.schemas.contacts.write',
  'crm.objects.owners.read',
  'settings.users.teams.read',
];

export async function getHubspotConnectStatus(accountId) {
  try {
    const res = await api.get(`/api/hubspot/is_connected?account_id=${accountId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return Promise.resolve(res.data);
  } catch (err) {
    return Promise.reject(err);
  }
}

export async function connectHubspotAuth(accountId, state) {
  const payload = { state };

  try {
    const res = await api.post(`/api/hubspot/connect?account_id=${accountId}`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return Promise.resolve(res.data);
  } catch (err) {
    return Promise.reject(err);
  }
}
