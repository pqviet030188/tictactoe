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
  onRoomActivityUpdated,
  matchError,
  makeMove,
  updateRoomSession,
  closeMatch,
  acceptJoin,
} from "../store/matchSlice";
import { eventChannel, type EventChannel, type Task } from "redux-saga";
import {
  eRoomActivity,
  type Match,
  type MatchResults,
  type RoomActivityUpdateRequest,
  type RoomActivityUpdateResponse,
} from "../types";
import { roomHub } from "../hubs";
import { safeInvokeHubWithAuth, waitForHubConnected } from "./lobbySaga";
import type { RootState } from "../store";

const MatchUpdatedEvent = "MatchUpdatedEvent";
const WsUpdateRoomActivity = "UpdateRoomActivity";

function createRoomMessageChannel(matchId: string, sessionId: string) {
  return eventChannel((emit) => {
    // Hub connection status events
    roomHub.onclose(() => {
      emit(
        roomHubStatusUpdate({
          matchId,
          sessionId,
          status: "hub_closed",
        })
      );
    });

    roomHub.onreconnected(() => {
      emit(
        roomHubStatusUpdate({
          matchId,
          sessionId,
          status: "connected",
        })
      );
    });

    roomHub.onreconnecting(() => {
      emit(
        roomHubStatusUpdate({
          matchId,
          sessionId,
          status: "hub_reconnecting",
        })
      );
    });

    // Hub message events
    roomHub.on(MatchUpdatedEvent, (results: MatchResults) => {
      emit(onCurrentMatchUpdatedEvent(results));
    });

    return () => {
      roomHub.off(MatchUpdatedEvent);
    };
  });
}

function* genConnectHub(action: ReturnType<typeof connectRoomHub>): Generator<
  | SelectEffect
  | PutEffect
  | CallEffect
  | ForkEffect
  | TakeEffect
  | CancelEffect,
  void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
> {

  const { matchId, sessionId } = action.payload;

  const currentMatch: Match | null = yield select(
    (state: RootState) => state.match.currentMatch?.match
  );

  if (currentMatch?.id !== matchId) {
    return;
  }

  yield put(
    updateRoomSession({
      matchId,
      sessionId,
    })
  );

  if (roomHub.state === "Disconnected") {
    yield call([roomHub, roomHub.start]);
  } else {
    yield call(waitForHubConnected, roomHub);
  }

  const channel: EventChannel<
    | ReturnType<typeof onCurrentMatchUpdatedEvent>
    | ReturnType<typeof roomHubStatusUpdate>
  > = yield call(createRoomMessageChannel, matchId, sessionId);

  const task = yield fork(function* () {
    while (true) {
      const message:
        | ReturnType<typeof onCurrentMatchUpdatedEvent>
        | ReturnType<typeof roomHubStatusUpdate> = yield take(channel);

      // Handle hub status updates
      if (message.type === roomHubStatusUpdate.type) {
        yield put(message);
        continue;
      }

      const messageMatch = message?.payload?.matches?.[0];

      if (!messageMatch) {
        continue;
      }

      const userId: string | null = yield select(
        (state: RootState) => state.user?.currentUser?.id
      );

      if (!userId) {
        continue;
      }

      // message match exists and user id exists

      // take current match from the store
      const currentMatch: {
        userId: string;
        sessionId: string;
        match: Match;
        roomState: "joining" | "closed" | "joined";
      } | null = yield select((state: RootState) => state.match.currentMatch);

      // if current match not found, continue and discard the message
      if (!currentMatch?.match || currentMatch?.match.id !== messageMatch.id) {
        continue;
      }

      // if current match updated timestamp is higher than the one in the message, continue and discard the message
      const currentMatchUpdatedAt = new Date(
        currentMatch.match.updatedAt
      ).getTime();
      const messageMatchUpdatedAt = new Date(messageMatch.updatedAt).getTime();
      if (currentMatchUpdatedAt > messageMatchUpdatedAt) {
        continue;
      }

      const roomState = currentMatch.roomState;

      // if current match is closed, continue
      if (roomState == "closed") {
        continue;
      }

      // pull user connection id, and its role captured in the message
      const messageUserRole =
        messageMatch.creatorId == userId
          ? "Creator"
          : messageMatch.memberId == userId
          ? "Member"
          : null;
      const messageUserConnectionId =
        messageUserRole === "Creator"
          ? messageMatch.creatorConnectionId
          : messageUserRole === "Member"
          ? messageMatch.memberConnectionId
          : null;

      // pull client connection id from hub
      const clientConnectionId = roomHub.connectionId;

      // pull current client status (joining/joined/leaving/left) and its role from the store
      const currentUserRole =
        currentMatch.match.creatorId == userId
          ? "Creator"
          : currentMatch.match.memberId == userId
          ? "Member"
          : null;

      // role is null, it's catching up, we might rely on response instead
      if (currentUserRole == null) {
        continue;
      }

      // if message role is null, and current status is joining or joined, leave the room, continue
      if (
        messageUserRole == null &&
        (roomState == "joined" || roomState == "joining")
      ) {
        yield put(closeMatch(messageMatch.id));
        continue;
      }

      // if message role mismatches with the current role, and current status is joining or joined, leave the room, continue
      if (
        messageUserRole != currentUserRole &&
        (roomState == "joined" || roomState == "joining")
      ) {
        yield put(closeMatch(messageMatch.id));
        continue;
      }

      // if message connection id is null, and current status is joining or joined, leave the room, continue
      if (
        messageUserConnectionId == null &&
        (roomState == "joined" || roomState == "joining")
      ) {
        yield put(closeMatch(messageMatch.id));
        continue;
      }

      // if message connection id mismatches with the client connection id, and current status is joining or joined, leave the room, continue
      if (
        messageUserConnectionId != clientConnectionId &&
        (roomState == "joined" || roomState == "joining")
      ) {
        yield put(closeMatch(messageMatch.id));
      }

      // finally, message is the latest, and message role matches with current role, and message is given for the current connection
      // update the message
      yield put(message);
    }
  });

  yield put(
    roomHubStatusUpdate({
      matchId,
      sessionId,
      status: "connected",
    })
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  yield put(
    roomHubStatusUpdate({
      matchId,
      sessionId,
      status: "disconnected",
    })
  );
}

function* genJoinRoom(
  roomId: string
): Generator<CallEffect | PutEffect, void, RoomActivityUpdateResponse> {
  try {
    const result: RoomActivityUpdateResponse = yield call(
      safeInvokeHubWithAuth,
      roomHub,
      WsUpdateRoomActivity,
      {
        roomActivity: eRoomActivity.JoinRoom,
        roomId,
      }
    );

    // if there's no match returned, close the match
    if (result.match == null) {
      yield put(closeMatch(roomId));
      return;
    }

    yield put(acceptJoin(roomId));

    // otherwise update the match in the store
    yield put(onRoomActivityUpdated(result.match));
  } catch (err) {
    yield put(matchError((err as Error).message));
  }
}

function* genLeaveRoom(
  roomId: string
): Generator<CallEffect | PutEffect, void, RoomActivityUpdateResponse> {
  try {
    const result: RoomActivityUpdateResponse = yield call(
      safeInvokeHubWithAuth,
      roomHub,
      WsUpdateRoomActivity,
      {
        roomActivity: eRoomActivity.LeaveRoom,
        roomId,
      } as RoomActivityUpdateRequest
    );

    // close the match regardless
    yield put(closeMatch(roomId));

    yield put(onRoomActivityUpdated(result.match));
  } catch (err) {
    yield put(matchError((err as Error).message));
  }
}

function* genMakeMove(
  action: ReturnType<typeof makeMove>
): Generator<CallEffect | PutEffect, void, RoomActivityUpdateResponse> {
  try {
    const result: RoomActivityUpdateResponse = yield call(
      safeInvokeHubWithAuth,
      roomHub,
      WsUpdateRoomActivity,
      {
        roomActivity: eRoomActivity.MakeMove,
        roomId: action.payload.matchId,
        move: action.payload.move,
      } as RoomActivityUpdateRequest
    );

    yield put(onRoomActivityUpdated(result.match));
  } catch (err) {
    yield put(matchError((err as Error).message));
  }
}

export function* genRoomHubStatusUpdate(
  action: ReturnType<typeof roomHubStatusUpdate>
): Generator<
  SelectEffect | CallEffect | PutEffect,
  void,
  {
    sessionId: string;
    match: Match;
  } | null
> {
  const { matchId, sessionId, status } = action.payload;

  const currentMatch: {
    sessionId: string;
    match: Match;
  } | null = yield select((state: RootState) => state.match.currentMatch);

  if (
    currentMatch?.match?.id !== matchId ||
    currentMatch?.sessionId !== sessionId
  ) {
    return;
  }

  if (status === "disconnected") {
    // perform join match
    yield call(genLeaveRoom, matchId);
  } else if (status === "connected") {
    // perform leave match
    yield call(genJoinRoom, matchId);
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
      yield takeLatest(makeMove.type, genMakeMove);
    }),
  ]);
}
