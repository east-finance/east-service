import axios from 'axios'

export interface IAuthTokens {
  access_token: string;
  refresh_token: string;
}

export const getOAuthTokens = async (authServiceUrl: string, serviceToken: string): Promise<IAuthTokens> => {
  const { data } = await axios.post(`${authServiceUrl}/v1/auth/token`, {},
    {
      headers: {
        Authorization: `bearer ${serviceToken}`
      }
    })
  return data
}
