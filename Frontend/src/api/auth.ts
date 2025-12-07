import { authRequests } from './requests';
import { store } from '../store';
import { clearUser } from '../store';
import type { LoginRequest, RegisterRequest, AuthResponse } from '../types';
import { authService } from '../services';

// Auth API functions
export const authApi = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    
    // clear user data
    store.dispatch(clearUser());

    const request = authRequests.login;
    const response = await request.send({
      payload: data,
    });
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Login failed');
    }
    
    const authData = response.data!;
    authService.setAuth(authData);
    return authData;
  },

  async register(data: RegisterRequest): Promise<{ message: string }> {
    const request = authRequests.register;
    const response = await request.send(
      {
        payload: data,
      }
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Registration failed');
    }
    
    return response.data!;
  },

  async refreshToken(): Promise<AuthResponse | null> {
    try {
      const request = authRequests.refreshToken;
      const response = await request.send({
        payload: {
          refreshToken: authService.getRefreshToken() as string
        },
      });
      
      if (!response.success) {
        return null;
      }

      const authData = response.data!;
      authService.setAuth(authData);

      return authData;
    } catch (error) {
      return null;
    }
  },

  async logout() {
    authService.clearAuth();
  }
};