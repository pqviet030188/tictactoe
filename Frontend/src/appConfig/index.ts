interface Config {
  apiBaseUrl: string;
  appName: string;
  cookies: {
    accessToken: string;
    refreshToken: string;
  };
}

const config: Config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  appName: import.meta.env.VITE_APP_NAME || 'TicTacToe',
  cookies: {
    accessToken: import.meta.env.VITE_JWT_COOKIE_NAME || 'x-access-token',
    refreshToken: import.meta.env.VITE_REFRESH_COOKIE_NAME || 'x-refresh-token',
  },
};

export default config;