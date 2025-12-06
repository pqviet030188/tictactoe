import { configureStore } from "@reduxjs/toolkit";
import createSagaMiddleware from "redux-saga";
import type { AppDispatch, RootState } from "./types";
import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";

import { userReducer } from "./userSlice";
import rootSaga from "../sagas";


const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: {
    user: userReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ thunk: false }).concat(sagaMiddleware),
});

sagaMiddleware.run(rootSaga);

// Typed dispatch
export const useAppDispatch: () => AppDispatch = useDispatch;

// Typed selector
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;