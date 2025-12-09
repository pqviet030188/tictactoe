import { createRequest } from './client';
import type {
  LoginRequest,
  AuthResponse,
  RegisterRequest,
  User,
} from '../../types';

export const authRequests = {
  login: createRequest<LoginRequest, AuthResponse>('/auth/login', 'POST'),
  register: createRequest<RegisterRequest, { message: string }>(
    '/auth/register',
    'POST'
  ),
  refreshToken: createRequest<{ 
    refreshToken: string
  }, AuthResponse>(
    '/auth/refresh',
    'POST'
  ),
  user: createRequest<object, User>('/auth/user', 'GET'),
  logout: createRequest<object, { message: string }>('/auth/logout', 'GET'),
};
