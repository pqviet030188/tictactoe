import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from '../types';

interface UserState {
  users: Record<string, User>; // map of userId to User
  currentUser: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  users: {},
  currentUser: null,
  loading: false,
  error: null,
};

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    fetchUser(state) {
      state.loading = true;
      state.error = null;
    },
    fetchUserSuccess(state, action: PayloadAction<User>) {
      state.loading = false;
      const user = action.payload;
      state.users[user.id] = user;
      state.currentUser = user;
    },
    fetchUserFailed(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    clearUser(state) {
      state.currentUser = null;
      state.users = {};
      state.loading = false;
      state.error = null;
    },
  },
});

export const { fetchUser, fetchUserSuccess, fetchUserFailed, clearUser } = userSlice.actions;
export const userReducer = userSlice.reducer;

// Selectors
export const selectCurrentUser = (state: { user: UserState }) => state.user.currentUser;
export const selectUserLoading = (state: { user: UserState }) => state.user.loading;
export const selectUserById = (state: { user: UserState }, userId: string) => state.user.users[userId];
export const selectUserError = (state: { user: UserState }) => state.user.error;