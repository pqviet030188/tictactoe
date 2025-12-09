import Cookies from 'js-cookie';
import config from '../config';
import type { AuthResponse } from '../types';
// import { clearUser, store } from '../store';

export const authService = {
  setAuth(authData: AuthResponse): void {
    const cookieOptions = {
      secure: window.location.protocol === 'https:',
      expires: 7, // 7 days
    };

    Cookies.set(config.cookies.accessToken, authData.accessToken, cookieOptions);
    Cookies.set(config.cookies.refreshToken, authData.refreshToken, cookieOptions);
  },

  getAccessToken(): string | undefined {
    return Cookies.get(config.cookies.accessToken);
  },

  getRefreshToken(): string | undefined {
    return Cookies.get(config.cookies.refreshToken);
  },

  hasAccessToken(): boolean {
    return !!this.getAccessToken();
  },

  clearAuth(): void {
    Cookies.remove(config.cookies.accessToken);
    Cookies.remove(config.cookies.refreshToken);  
  }
};