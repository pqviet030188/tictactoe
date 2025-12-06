import { call, put, takeLatest, type CallEffect, type PutEffect } from "redux-saga/effects";
import { fetchUserSuccess, fetchUserFailed } from "../store/userSlice";

interface User {
  id: number;
  name: string;
}

// Mock API
const getUserApi = (): Promise<User> =>
  new Promise((resolve) =>
    setTimeout(() => resolve({ id: 1, name: "John Doe" }), 1000)
  );

function* fetchUserWorker(): Generator<
   CallEffect<User> | PutEffect,
  void,
  User
> {
  try {
    const user = yield call(getUserApi);
    yield put(fetchUserSuccess(user));
  } catch (err) {
    yield put(fetchUserFailed((err as Error).message));
  }
}

export function* userSaga() {
  yield takeLatest("user/fetchUser", fetchUserWorker);
}