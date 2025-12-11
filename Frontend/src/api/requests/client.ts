import { Client, type QueryParamsType } from '@hyper-fetch/core';
import config from '../../appConfig';
import { authRequests } from './auth';
import { authService } from '../../services';
import { onLoginFailed, store } from '../../store';

// Create Hyperfetch client
export const client = new Client({
  url: config.apiBaseUrl,
  
});

client.onAuth((request) => {
  const authToken = authService.getAccessToken();
  if (authToken) {
    return request.setHeaders({
      ...request.headers,
      Authorization: `Bearer ${authToken}`,
    });
  }

  return request;
});

// Token refresh in progress flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

// Function to refresh token
const refreshAccessToken = async (): Promise<boolean> => {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      // Import authApi here to avoid circular dependency
      const { authApi } = await import('../auth');
      const result = await authApi.refreshToken();
      return result !== null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// Add response interceptor for auth errors and token refresh
client.onResponse(async (response, request) => {
  if (response.status === 401) {
    
    if (!request.endpoint.includes(authRequests.refreshToken.endpoint)) {
      const refreshSuccess = await refreshAccessToken();
      if (refreshSuccess) {
        // retry
        return request.send();
      } else {
        
        store.dispatch(onLoginFailed('Session expired. Please log in again.'));
        return response;
      }
    }
  }
  return response;
});


type RequestParams<Req, Res, Q extends QueryParamsType | null = null, E = unknown> = {
  response: Res;
  payload: Req;
  queryParams: Q;
  error: E;
};

// Create request factory with data support
export const createRequest = <
  Req = unknown,
  Res = unknown,
  Q extends QueryParamsType | null = null,
  E = { message: string } | null | undefined
>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET'
) => {
  const request = client.createRequest<RequestParams<Req, Res, Q, E>>()({
    endpoint,
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  });
  return request;
};