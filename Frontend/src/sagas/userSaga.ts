import { call, put, takeLatest, type CallEffect, type PutEffect } from "redux-saga/effects";
import { fetchUserSuccess, fetchUserFailed } from "../store";
import { authRequests } from "../api/requests";
import type { RequestResponseType } from "@hyper-fetch/core";

type UserRequest = typeof authRequests.user;
type UserResponse = RequestResponseType<UserRequest>;

function* fetchUserWorker(): Generator<
  CallEffect<UserResponse> | PutEffect,
  void,
  UserResponse
> {
  try {
    console.log("Fetching user...");
    const response: UserResponse = yield call(() => 
      authRequests.user.send({ payload: {} })
    );
    if (response.success && response.data) {
      yield put(fetchUserSuccess(response.data));
    } else {
      yield put(fetchUserFailed(response.error?.message ?? 'Failed to fetch user'));
    }
  } catch (err) {
    yield put(fetchUserFailed((err as Error).message));
  }
}

export function* userSaga() {
  yield takeLatest("user/fetchUser", fetchUserWorker);
}