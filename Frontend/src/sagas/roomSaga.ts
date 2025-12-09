import {
  all,
  call,
  cancel,
  fork,
  put,
  select,
  spawn,
  take,
  takeLatest,
  type CallEffect,
  type CancelEffect,
  type ForkEffect,
  type PutEffect,
  type SelectEffect,
  type TakeEffect,
} from "redux-saga/effects";
import {
  disconnectRoomHub,
  connectRoomHub,
  roomHubStatusUpdate,
  onCurrentMatchUpdatedEvent,
  joinMatch,
  leaveMatch,
  onRoomActivityUpdated,
  matchError,
  makeMove,
  updateRoomSession,
} from "../store/matchSlice";
import {
  eventChannel,
  type EventChannel,
  type Task,
} from "redux-saga";
import { store } from "../store";
import { eRoomActivity, type Match, type MatchResults, type RoomActivityUpdateRequest, type RoomActivityUpdateResponse, type WSInvokeOutput } from "../types";
import { roomHub } from "../hubs";
import { safeInvokeHubWithAuth, waitForHubConnected } from "./lobbySaga";

const MatchUpdatedEvent = "MatchUpdatedEvent";
const WsUpdateRoomActivity = "UpdateRoomActivity";

function* createRoomMessageChannel(): Generator<
  void,
  EventChannel<ReturnType<typeof onCurrentMatchUpdatedEvent>>,
  void
> {
  return eventChannel((emit) => {
    roomHub.on(MatchUpdatedEvent, (results: MatchResults) => {
      emit(onCurrentMatchUpdatedEvent(results));
    });

    return () => {
      roomHub.off(MatchUpdatedEvent);
    };
  });
}

function* genConnectHub(
  action: ReturnType<typeof connectRoomHub>
): Generator<SelectEffect | PutEffect | CallEffect | ForkEffect | TakeEffect | CancelEffect, void, any> {
  const { matchId, sessionId } = action.payload;
  const currentMatch: Match | null = yield select(
    (state: ReturnType<typeof store.getState>) => state.match.currentMatch?.match
  );

  if (
    currentMatch?.id !== matchId
  ) {
    return;
  }

  yield put(updateRoomSession({
    matchId,
    sessionId
  }));

  if (roomHub.state === "Disconnected") {
    yield call([roomHub, roomHub.start]);
  } else {
    yield call(waitForHubConnected, roomHub);
  }

  roomHub.onclose((err) => {
    console.log("Hub closed", err);
  });

  roomHub.onreconnected(() => {
    store.dispatch(
      roomHubStatusUpdate({
        matchId,
        sessionId,
        status: "connected",
      })
    );
  });

  const channel: EventChannel<ReturnType<typeof onCurrentMatchUpdatedEvent>> =
    yield call(createRoomMessageChannel);

  const task = yield fork(function* () {
    while (true) {
      const message: ReturnType<typeof onCurrentMatchUpdatedEvent> = yield take(
        channel
      );

      switch (message.type) {
        case onCurrentMatchUpdatedEvent.type:
          yield put(message);
          break;
      }
    }
  });

  yield put(
    roomHubStatusUpdate({
        matchId,
        sessionId,
        status: "connected",
      }));

  yield take((x: any): x is ReturnType<typeof disconnectRoomHub> => {
    return (
      x.type === disconnectRoomHub.type &&
      (x as ReturnType<typeof disconnectRoomHub>).payload?.matchId ===
        action.payload?.matchId &&
      (x as ReturnType<typeof disconnectRoomHub>).payload?.sessionId ===
        action.payload?.sessionId
    );
  });

  channel.close();
  yield cancel(task as Task);
  store.dispatch(
    roomHubStatusUpdate({
      matchId,
      sessionId,
      status: "disconnected",
    })
  );
}

function* genJoinRoom(action: ReturnType<typeof joinMatch>): Generator<CallEffect | PutEffect, void, any> {
  try {
      const result: WSInvokeOutput<RoomActivityUpdateResponse> = 
      yield call(() => {
        return safeInvokeHubWithAuth<
          RoomActivityUpdateResponse
        >(roomHub, WsUpdateRoomActivity, {
          roomActivity: eRoomActivity.JoinRoom,
          roomId: action.payload,
        } as RoomActivityUpdateRequest);
      });
  
      yield put(
        onRoomActivityUpdated(result.result?.match)
      );
    } catch (err) {
      yield put(matchError((err as Error).message));
    }
}

function* genLeaveRoom(action: ReturnType<typeof leaveMatch>): Generator<CallEffect | PutEffect, void, any> {
  try {
      const result: WSInvokeOutput<RoomActivityUpdateResponse> = 
      yield call(() => {
        return safeInvokeHubWithAuth<
          RoomActivityUpdateResponse
        >(roomHub, WsUpdateRoomActivity, {
          roomActivity: eRoomActivity.LeaveRoom,
          roomId: action.payload,
        } as RoomActivityUpdateRequest);
      });
  
      yield put(
        onRoomActivityUpdated(result.result?.match)
      );
    } catch (err) {
      yield put(matchError((err as Error).message));
    }
}

function* genMakeMove(action: ReturnType<typeof makeMove>): Generator<CallEffect | PutEffect, void, any> {
  try {
      const result: WSInvokeOutput<RoomActivityUpdateResponse> = 
      yield call(() => {
        return safeInvokeHubWithAuth<
          RoomActivityUpdateResponse
        >(roomHub, WsUpdateRoomActivity, {
          roomActivity: eRoomActivity.MakeMove,
          roomId: action.payload.matchId,
          move: action.payload.move
        } as RoomActivityUpdateRequest);
      });
  
      yield put(
        onRoomActivityUpdated(result.result?.match)
      );
    } catch (err) {
      yield put(matchError((err as Error).message));
    }
}

function* genRoomHubStatusUpdate(
  action: ReturnType<typeof roomHubStatusUpdate>
): Generator<any, void, any> {
  const { matchId, sessionId, status } = action.payload;
  
  const currentMatch: {
    sessionId: string;
    match: Match;
  } | null = yield select(
    (state: ReturnType<typeof store.getState>) => state.match.currentMatch
  );

  if (
    currentMatch?.match?.id !== matchId ||
    currentMatch?.sessionId !== sessionId
  ) {
    return;
  }

  if (status === "disconnected") {
    // perform join match
    yield call(genLeaveRoom, {
      type: leaveMatch.type, payload: matchId
    });
  }
  else if (status === "connected") {
    // perform leave match
    yield call(genJoinRoom, {
      type: joinMatch.type, payload: matchId
    });
  }
}

export function* roomSaga() {
  yield all([
    spawn(function* () {
      yield takeLatest(connectRoomHub.type, genConnectHub);
    }),
    spawn(function* () {
      yield takeLatest(roomHubStatusUpdate.type, genRoomHubStatusUpdate);
    }),
    spawn(function* () {
      yield takeLatest(roomHubStatusUpdate.type, genRoomHubStatusUpdate);
    }),
    spawn(function* () {
      yield takeLatest(joinMatch.type, genJoinRoom);
    }),
    spawn(function* () {
      yield takeLatest(leaveMatch.type, genLeaveRoom);
    }),
    spawn(function* () {
      yield takeLatest(makeMove.type, genMakeMove);
    }),
  ]);
}
