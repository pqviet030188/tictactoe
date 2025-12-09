import { authRequests } from './requests';
import type { RegisterRequest, AuthResponse } from '../types';
import { authService } from '../services';

export const authApi = {
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
      console.log('Error refreshing token:', error);
      return null;
    }
  }
};