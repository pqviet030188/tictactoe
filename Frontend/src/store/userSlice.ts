import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthResponse, LoginRequest, User } from "../types";
import { authService } from "../services";

interface UserState {
  users: Record<string, User>; // map of userId to User
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  login: {
    loading: boolean;
    success: boolean;
    error: string | null;
  };
}

const initialState: UserState = {
  users: {},
  currentUser: null,
  loading: false,
  error: null,
  login: {
    loading: false,
    success: false,
    error: null,
  },
};

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    loadUser(state) {
      state.loading = true;
      state.error = null;
    },
    onhUserLoaded(state, action: PayloadAction<User>) {
      state.loading = false;
      state.login.error = null;
      state.login.loading = false;
      state.login.success = true;
      state.error = null;
      state.loading = false;
      state.users = {};
      const user = action.payload;
      state.users[user.id] = user;
      state.currentUser = user;
    },
    onUserLoadingFailed(state, action: PayloadAction<string>) {
      state.currentUser = null;
      state.users = {};
      state.loading = false;
      state.error = action.payload;
      state.login = {
        loading: false,
        success: false,
        error: null,
      };
      authService.clearAuth();
    },
    clearUser(state) {
      state.currentUser = null;
      state.users = {};
      state.loading = false;
      state.error = null;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    logout(state, _2: PayloadAction<void>){
      state.currentUser = null;
      state.users = {};
      state.loading = false;
      state.error = null;
      state.login = {
        loading: false,
        success: false,
        error: null,
      };

      authService.clearAuth();
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    loginRequest(state, _2: PayloadAction<LoginRequest>) {
      state.login.loading = true;
      state.login.error = null;
      state.login.success = false;
      state.error = null;
      state.currentUser = null;
      state.users = {};
      state.loading = true;
    },
    onLoginSuccess(state, action: PayloadAction<AuthResponse | null | undefined>) {
      state.login.error = null;
      state.login.loading = false;
      state.login.success = true;
      if (action.payload != null) {
        authService.setAuth(action.payload);
      }
    },
    onLoginFailed(state, action: PayloadAction<string>) {
      state.currentUser = null;
      state.users = {};
      state.loading = false;
      state.error = null;
      state.login.error = action.payload;
      state.login.loading = false;
      state.login.success = false;
      authService.clearAuth();
    },
  },
});

export const {
  loginRequest,
  onLoginFailed,
  onLoginSuccess,
  loadUser,
  onhUserLoaded,
  onUserLoadingFailed,
  clearUser,
  logout,
} = userSlice.actions;
export const userReducer = userSlice.reducer;

// Selectors
export const selectCurrentUser = (state: { user: UserState }) =>
  state.user.currentUser;
export const selectUserLoading = (state: { user: UserState }) =>
  state.user.loading;
export const selectUserById = (state: { user: UserState }, userId: string) =>
  state.user.users[userId];
export const selectUserError = (state: { user: UserState }) => state.user.error;
