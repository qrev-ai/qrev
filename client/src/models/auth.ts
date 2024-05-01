export interface AzureGetTokenParams {
  success: boolean;
  access_token: string;
  id_token: string;
}

export interface LJWTInfoParams {
  LJWT: string;
  data: {
    access_token: string;
    id_token: string;
    state: string;
    user_id: string;
  };
}

export interface AzureProfileResParams {
  userPrincipalName: string;
  id: string;
  displayName: string;
  surname: string;
  givenName: string;
  preferredLanguage: string;
  mail: string;
  mobilePhone: string | null;
  jobTitle: string | null;
  officeLocation: string | null;
  businessPhones: string[];
}
