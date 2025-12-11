import { expectSaga } from "redux-saga-test-plan";
import {
  connectRoomHub,
  roomHubStatusUpdate,
  disconnectRoomHub,
} from "../../store/matchSlice";
import {
  eGameOutcome,
  eGameTurn,
  ePlayerStatus,
  type User,
  type Match as MatchType,
} from "../../types";
import { HubConnectionState } from "@microsoft/signalr";
import { roomSaga } from "../roomSaga";

jest.mock("../../hubs", () => ({
  roomHub: {
    state: 0, // HubConnectionState.Disconnected
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    off: jest.fn(),
    invoke: jest.fn(),
    send: jest.fn(),
    onclose: jest.fn(),
    onreconnected: jest.fn(),
    onreconnecting: jest.fn(),
  },
}));

jest.mock("../../api", () => ({
  authRequests: {
    refreshToken: {
      send: jest.fn(),
    },
  },
}));

jest.mock("../../services", () => ({
  authService: {
    getRefreshToken: jest.fn(),
  },
}));

jest.mock("../../store", () => ({
  logout: () => ({ type: "user/logout" }),
  loadUser: () => ({ type: "user/loadUser" }),
  store: () => ({
    dispatch: jest.fn(),
  }),
  connectRoomHub: (payload: { sessionId: string; matchId: string }) => ({
    type: "match/connectRoomHub",
    payload,
  }),
  disconnectRoomHub: (payload: { sessionId: string; matchId: string }) => ({
    type: "match/disconnectRoomHub",
    payload,
  }),
}));

const generateMockMatchAndUser = () => {
  const match: MatchType = {
    id: "match-123",
    name: "Test Match",
    creatorId: "user-123",
    memberId: "user-456",
    creatorConnectionId: "conn-123",
    memberConnectionId: "conn-456",
    creatorMoves: 0,
    memberMoves: 0,
    nextTurn: eGameTurn.Creator,
    gameOutcome: eGameOutcome.Going,
    hasFinished: false,
    isBlocked: false,
    creatorStatus: ePlayerStatus.Joined,
    memberStatus: ePlayerStatus.Joined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const user: User = {
    id: match.creatorId,
    email: "test@example.com",
  };
  return { match, user };
};

describe("Room Saga", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockHub: any;

  beforeEach(async () => {
    const { roomHub } = await import("../../hubs");
    mockHub = roomHub;
    mockHub.state = HubConnectionState.Disconnected;
    jest.clearAllMocks();
  });

  describe("connectToHubSaga", () => {
    it("should start hub if disconnected", async () => {
      const sessionId = "test-session-123";
      const { match } = generateMockMatchAndUser();
      const saga = expectSaga(roomSaga);

      const result = await saga
        .provide({
          select() {
            return match;
          },
        })
        .dispatch(
          connectRoomHub({
            sessionId,
            matchId: match.id,
          })
        )
        .run();

      // search put for hubConnectedAction action
      const putEffects = result.effects.put;
      const hubStatusUpdateAction = putEffects.find(
        (effect) => effect.payload.action.type === roomHubStatusUpdate.type
      );

      expect(mockHub.start).toHaveBeenCalledTimes(1);
      expect(hubStatusUpdateAction?.payload?.action?.payload).toEqual(
        expect.objectContaining({
          status: "connected",
          matchId: match.id,
          sessionId,
        })
      );
    });

    it("should start hub if disconnected, and close if requested", async () => {
      const sessionId = "test-session-123";
      const { match } = generateMockMatchAndUser();

      // run saga
      const results = await expectSaga(roomSaga)
        .provide({
          select() {

            // mock static select to return match
            return match;
          },
        })
        .dispatch(
          connectRoomHub({
            sessionId,
            matchId: match.id,
          })
        )
        .delay(300)
        .dispatch(
          disconnectRoomHub({
            sessionId,
            matchId: match.id,
          })
        )
        .silentRun(500); 
      
      // expect hub to get staretd and on
      expect(mockHub.start).toHaveBeenCalled();
      expect(mockHub.on).toHaveBeenCalled();
      expect(mockHub.off).toHaveBeenCalled();

      // search put for disconnect action
      const putEffects = results.effects.put;
      const disconnectAction = putEffects.find(
        (effect) =>
          effect.payload.action.type === roomHubStatusUpdate.type &&
          effect.payload.action.payload.status === "disconnected"
      );

      // verify disconnect action payload
      expect(disconnectAction?.payload?.action?.payload).toEqual(
        expect.objectContaining({
          status: "disconnected",
          matchId: match.id,
          sessionId,
        })
      );

      // verify hub stop called with event listeners removed
      expect(mockHub.on).toHaveBeenCalledTimes(1);
      expect(mockHub.off).toHaveBeenCalledTimes(1);
    });
  });
});
