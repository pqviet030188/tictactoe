import { combineReducers, configureStore } from "@reduxjs/toolkit";
import createSagaMiddleware from "redux-saga";
import {
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from "react-redux";

import { userReducer } from "./userSlice";
import { matchReducer } from "./matchSlice";
import rootSaga from "../sagas";

const rootReducer = combineReducers({
  user: userReducer,
  match: matchReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export const setupStore = (preloadedState?: Partial<RootState> | undefined) => {
  const sagaMiddleware = createSagaMiddleware();
  const store = configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ thunk: false }).concat(sagaMiddleware),
  });
  sagaMiddleware.run(rootSaga);
  return store;
}

export const store = setupStore();
export type AppStore = ReturnType<typeof setupStore>
export type AppDispatch = typeof store.dispatch;

// Typed dispatch
export const useAppDispatch: () => AppDispatch = useDispatch;
// Typed selector
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
