import { all } from "redux-saga/effects";
import { userSaga } from "./userSaga";
import { lobbySaga } from "./lobbySaga";
import { roomSaga } from "./roomSaga";

export default function* rootSaga() {
  yield all([userSaga(), lobbySaga(), roomSaga()]);
}