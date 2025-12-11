import {
  all,
  call,
  put,
  spawn,
  takeLatest,
  type CallEffect,
  type PutEffect,
} from "redux-saga/effects";
import {
  onhUserLoaded,
  onUserLoadingFailed,
  loadUser,
  loginRequest,
  onLoginSuccess,
  onLoginFailed,
} from "../store/userSlice";
import { authRequests } from "../api/requests";
import type { RequestResponseType } from "@hyper-fetch/core";
import type { LoginRequest as LoginRequestPayload } from "../types";
import type { PayloadAction } from "@reduxjs/toolkit";

type UserRequest = typeof authRequests.user;
type UserResponse = RequestResponseType<UserRequest>;

type LoginRequest = typeof authRequests.login;
type LoginResponse = RequestResponseType<LoginRequest>;

function* genLogin(action: PayloadAction<LoginRequestPayload>): Generator {
  try {
    const response: LoginResponse = yield call(
      [authRequests.login, authRequests.login.send], 
      { payload: action.payload });

    if (response.success && response.data) {
      yield put(onLoginSuccess(response.data));
    } else {
      yield put(onLoginFailed(response.error?.message ?? "Failed to login"));
    }
  } catch (error) {
    yield put(onLoginFailed((error as Error).message));
  }
}

function* genLoadUser(): Generator<
  CallEffect<UserResponse> | PutEffect,
  void,
  UserResponse
> {
  try {
    const response: UserResponse = yield call(
      [authRequests.user, authRequests.user.send], 
      { payload: {} });

    if (response.success && response.data) {
      yield put(onhUserLoaded(response.data));
    } else {
      yield put(
        onUserLoadingFailed(response.error?.message ?? "Failed to fetch user")
      );
    }
  } catch (err) {
    yield put(onUserLoadingFailed((err as Error).message));
  }
}

function* genOnUserLoaded(): Generator {
  yield put(onLoginSuccess());
}

export function* userSaga() {
  yield all([
    spawn(function* () {
      yield takeLatest(loginRequest.type, genLogin);
    }),
    spawn(function* () {
      yield takeLatest(loadUser.type, genLoadUser);
    }),
    spawn(function* () {
      yield takeLatest(onhUserLoaded.type, genOnUserLoaded);
    }),
  ]);
}
