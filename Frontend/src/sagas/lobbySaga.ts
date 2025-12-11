import {
  all,
  call,
  cancel,
  fork,
  put,
  select,
  spawn,
  take,
  takeEvery,
  takeLatest,
  type CallEffect,
  type CancelEffect,
  type ForkEffect,
  type PutEffect,
  type RaceEffect,
  type SelectEffect,
  type TakeEffect,
} from "redux-saga/effects";
import { lobbyHub } from "../hubs";
import { eventChannel, type EventChannel, type Task } from "redux-saga";
import {
  type MatchResults,
  type CreateMatchRequest,
  type User,
} from "../types";
import {
  connectLobbyHub,
  disconnectLobbyHub,
  hubConnected,
  joinLobby,
  lobbyError,
  onMatchesCreated,
  onMatchesUpdated,
  loadLatestMatches,
  createMatch,
  hubConnectionStatusUpdate,
} from "../store/matchSlice";
import { loadUser, logout } from "../store";
import { authRequests } from "../api";
import { authService } from "../services";
import type { RequestResponseType } from "@hyper-fetch/core";
import { emptyMatchResults } from "../constants";
import type { HubConnection } from "@microsoft/signalr";
import type { RootState } from "../store";

const MatchesCreatedEvent = "MatchesCreated";
const MatchesUpdatedEvent = "MatchesUpdated";
const WsActionCreateRoom = "CreateRoom";
const WsActionJoinLobby = "JoinLobby";

function createLobbyMessageChannel() {
  return eventChannel((emit) => {
    lobbyHub.onreconnected(() => {
      emit(hubConnected());
    });

    lobbyHub.onreconnecting(() => {
      emit(hubConnectionStatusUpdate("hub_reconnecting"));
    });

    lobbyHub.onclose(() => {
      emit(hubConnectionStatusUpdate("hub_closed"));
    });


    lobbyHub.on(MatchesCreatedEvent, (results: MatchResults) => {
      emit(onMatchesCreated(results));
    });

    lobbyHub.on(MatchesUpdatedEvent, (results: MatchResults) => {
      emit(onMatchesUpdated(results));
    });

    return () => {
      lobbyHub.off(MatchesCreatedEvent);
      lobbyHub.off(MatchesUpdatedEvent);
    };
  });
}

export function waitForHubConnected(hub: HubConnection): Promise<boolean> {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (hub.state === "Connected") {
        clearInterval(checkInterval);
        resolve(true);
      }
    }, 500);
  });
}

function* genConnectHub(
  action: ReturnType<typeof connectLobbyHub>
): Generator<
  | CallEffect
  | PutEffect
  | ForkEffect
  | TakeEffect
  | RaceEffect<unknown>
  | CancelEffect
  | SelectEffect,
  void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
> {
  if (lobbyHub.state === "Disconnected") {
    yield call([lobbyHub, lobbyHub.start]);
  } else {
    // we need it due to takeLatest effect and the connection might not be ready
    yield call(waitForHubConnected, lobbyHub);
  }

  const channel: EventChannel<
    ReturnType<typeof onMatchesCreated> | ReturnType<typeof onMatchesUpdated>
  > = yield call(createLobbyMessageChannel);

  const task = yield fork(function* () {
    while (true) {
      const message:
        | ReturnType<typeof onMatchesCreated>
        | ReturnType<typeof onMatchesUpdated>
        | ReturnType<typeof hubConnectionStatusUpdate> = yield take(channel);

      const currentUser: User | null = yield select(
        (state: RootState) => state.user.currentUser
      );

      switch (message.type) {
        case onMatchesCreated.type:
          yield put({
            ...message,
            payload: { ...message.payload, currentUser },
          });
          break;
        case onMatchesUpdated.type:
          yield put({
            ...message,
            payload: { ...message.payload, currentUser },
          });
          break;
        case hubConnectionStatusUpdate.type:
          yield put(message);
          break;
      }
    }
  });

  yield put(hubConnected());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  yield take((x: any): x is ReturnType<typeof disconnectLobbyHub> => {
    return (
      x.type === disconnectLobbyHub.type &&
      (x as ReturnType<typeof disconnectLobbyHub>).payload === action.payload
    );
  });

  channel.close();
  yield cancel(task as Task);
}

export function* safeInvokeHubWithAuth<
  T extends {
    error?: {
      errorCode: string;
      errorMessage: string;
    };
  }
>(
  hub: HubConnection,
  method: string,
  ...args: unknown[]
): Generator<
  CallEffect | CallEffect<unknown> | PutEffect,
  T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
> {
  try {
    const result: T = yield call([hub, hub.invoke], method, ...args);

    if (result.error?.errorCode === "AUTH_FAILED") {
      throw new Error(result.error?.errorCode);
    }

    return result;
  } catch (err) {
    if (err instanceof Error && err.message === "AUTH_FAILED") {
      
      const rresponse: RequestResponseType<typeof authRequests.refreshToken> = yield call(
        [authRequests.refreshToken, authRequests.refreshToken.send],
        {
          payload: {
            refreshToken: authService.getRefreshToken() ?? "",
          },
        }
      );

      if (!rresponse.success || !rresponse.data) {
        yield put(logout());
      } else {

        // new tokens received, reload user info
        yield put(loadUser());
      }

      const result: T = yield call([hub, hub.invoke], method, ...args);
      return result;
    }

    throw err;
  }
}

function* genJoinLobbySaga(): Generator<
  CallEffect | PutEffect | SelectEffect,
  void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
> {
  try {
    const result: MatchResults & {
          error?: {
            errorCode: string;
            errorMessage: string;
          };
        } = yield call(safeInvokeHubWithAuth, lobbyHub, WsActionJoinLobby);
    
    const currentUser: User | null = yield select(
      (state: RootState) => state.user.currentUser
    );

    yield put(
      loadLatestMatches({
        ...(result ?? emptyMatchResults),
        currentUser,
      })
    );
  } catch (err) {
    yield put(lobbyError((err as Error).message));
  }
}

function* genCreateMatch(): Generator<
  CallEffect | PutEffect | SelectEffect,
  void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
> {
  try {
    const result: MatchResults & {
          error?: {
            errorCode: string;
            errorMessage: string;
          };
        } = yield call(safeInvokeHubWithAuth, lobbyHub, WsActionCreateRoom, {
        name: "New Match",
      } as CreateMatchRequest);

    const currentUser: User | null = yield select(
      (state: RootState) => state.user.currentUser
    );

    yield put(
      onMatchesCreated({
        ...(result ?? emptyMatchResults),
        currentUser,
      })
    );
  } catch (err) {
    yield put(lobbyError((err as Error).message));
  }
}

function* genHubConnected(): Generator<PutEffect, void, unknown> {
  yield put(joinLobby());
}

export function* lobbySaga() {
  yield all([
    spawn(function* () {
      yield takeLatest(connectLobbyHub.type, genConnectHub);
    }),
    spawn(function* () {
      yield takeLatest(joinLobby.type, genJoinLobbySaga);
    }),
    spawn(function* () {
      yield takeLatest(hubConnected.type, genHubConnected);
    }),
    spawn(function* () {
      yield takeEvery(createMatch.type, genCreateMatch);
    }),
  ]);
}
