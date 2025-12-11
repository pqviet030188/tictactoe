import { expectSaga } from "redux-saga-test-plan";
import * as matchers from "redux-saga-test-plan/matchers";
import { throwError } from "redux-saga-test-plan/providers";
import { put } from "redux-saga/effects";
import {
  lobbySaga,
  safeInvokeHubWithAuth,
  waitForHubConnected,
} from "../../sagas/lobbySaga";
import {
  connectLobbyHub,
  disconnectLobbyHub,
  hubConnected,
  joinLobby,
  onMatchesCreated,
  loadLatestMatches,
  createMatch,
} from "../../store/matchSlice";
import { logout, loadUser } from "../../store";
import type { MatchResults, User } from "../../types";
import { authRequests } from "../../api";
import { authService } from "../../services";
import { HubConnectionState, HubConnection } from "@microsoft/signalr";

jest.mock("../../hubs", () => ({
  lobbyHub: {
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
  disconnectLobbyHub: (sessionId: string) => ({
    type: "match/disconnectLobbyHub",
    payload: sessionId,
  }),
}));

// helpers
const createMockHub = () =>
  ({
    state: HubConnectionState.Disconnected,
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    off: jest.fn(),
    invoke: jest.fn(),
    send: jest.fn(),
    onclose: jest.fn(),
    onreconnected: jest.fn(),
    onreconnecting: jest.fn(),
  } as unknown as HubConnection);

describe("Lobby Saga", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockHub: any;

  const currentUser: User = { id: "user-1", email: "testuser@example.com" };

  beforeEach(async () => {
    const { lobbyHub } = await import("../../hubs");
    mockHub = lobbyHub;
    mockHub.state = HubConnectionState.Disconnected;
    jest.clearAllMocks();
  });

  describe("waitForHubConnected", () => {
    it("should resolve when hub is connected", async () => {
      mockHub.state = HubConnectionState.Connected;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await waitForHubConnected(mockHub as any);
      expect(result).toBe(true);
    });

    it("should wait until hub is connected", async () => {
      setTimeout(() => {
        mockHub.state = HubConnectionState.Connected;
      }, 100);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await waitForHubConnected(mockHub as any);
      expect(result).toBe(true);
    });
  });

  describe("safeInvokeHubWithAuth", () => {
    it("should invoke hub method successfully", async () => {
      const testHub = createMockHub();

      const mockResult = { success: true };
      const mockInvoke = jest.fn().mockResolvedValue(mockResult);
      testHub.invoke = mockInvoke;

      const result = await expectSaga(
        safeInvokeHubWithAuth,
        testHub as unknown as HubConnection,
        "TestMethod",
        "arg1"
      )
        .call.like({
          fn: testHub.invoke,
          args: ["TestMethod", "arg1"],
        })

        // not calling refresh token
        .not.call.like({
          fn: authRequests.refreshToken.send,
        })

        // and not calling put
        .not.call.like({
          fn: put,
        })
        .returns(mockResult)
        .run();

      expect(result.returnValue).toEqual(mockResult);
    });

    it("should refresh token and retry on AUTH_FAILED", async () => {
      const testHub = createMockHub();

      // setup mock invoke
      const authFailedResult = {
        error: { errorCode: "AUTH_FAILED", errorMessage: "Token expired" },
      };
      const successResult = { success: true };
      let callCount = -1;
      const mockInvoke = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 0) return Promise.resolve(authFailedResult);
        return Promise.resolve(successResult);
      });
      testHub.invoke = mockInvoke;

      // setup mock refresh token
      const refreshResponse = {
        success: true,
        data: { accessToken: "new-token", refreshToken: "new-refresh" },
      };
      (authService.getRefreshToken as jest.Mock).mockReturnValue(
        "old-refresh-token"
      );
      (authRequests.refreshToken.send as jest.Mock).mockResolvedValue(
        refreshResponse
      );

      const result = await expectSaga(
        safeInvokeHubWithAuth,
        testHub as HubConnection,
        "TestMethod",
        "arg1"
      )
        .put(loadUser())
        .returns(successResult)
        .run();

      expect(result.returnValue).toEqual(successResult);
      expect(mockInvoke).toHaveBeenCalledTimes(2);
      expect(authService.getRefreshToken).toHaveBeenCalledTimes(1);
      expect(authRequests.refreshToken.send).toHaveBeenCalledTimes(1);
    });

    it("should logout if refresh token fails", async () => {
      const testHub = createMockHub();

      // setup mock invoke
      const authFailedResult = {
        error: { errorCode: "AUTH_FAILED", errorMessage: "Token expired" },
      };
      const mockInvoke = jest.fn().mockResolvedValue(authFailedResult);
      testHub.invoke = mockInvoke;

      // setup mock refresh token failure
      const refreshResponse = { success: false, data: null };
      (authService.getRefreshToken as jest.Mock).mockReturnValue(
        "old-refresh-token"
      );
      (authRequests.refreshToken.send as jest.Mock).mockResolvedValue(
        refreshResponse
      );

      await expectSaga(safeInvokeHubWithAuth, testHub, "TestMethod", "arg1")
        .put(logout())
        .run();

      expect(mockInvoke).toHaveBeenCalledTimes(2);
      expect(authService.getRefreshToken).toHaveBeenCalledTimes(1);
    });

    it("should throw non-auth errors", async () => {
      const error = new Error("Network error");
      const mockInvoke = jest.fn().mockRejectedValue(error);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const testHub = { invoke: mockInvoke } as any;

      await expect(
        expectSaga(safeInvokeHubWithAuth, testHub, "TestMethod")
          .provide([
            [
              matchers.call([testHub, testHub.invoke], "TestMethod"),
              throwError(error),
            ],
          ])
          .run()
      ).rejects.toThrow("Network error");
    });
  });

  describe("connectToHubSaga", () => {
    it("should start hub if disconnected", async () => {
      const sessionId = "test-session-123";

      const saga = expectSaga(lobbySaga);
      const result = await saga
        .dispatch(connectLobbyHub(sessionId))
        .run();

      // search put for hubConnectedAction action
      const putEffects = result.effects.put;
      const hubConnectedAction = putEffects.find(
        (effect) => effect.payload.action.type === hubConnected.type
      );

      expect(mockHub.start).toHaveBeenCalledTimes(1);
      expect(hubConnectedAction?.payload?.action).toBeDefined();
    });

    it("should start hub if disconnected, and close if requested", async () => {
      const sessionId = "test-session-123";

      const saga = expectSaga(lobbySaga);
      const sagaRun = saga.run();
      
      saga.dispatch(connectLobbyHub(sessionId));
      // wait a bit to ensure connection
      await new Promise((res) => setTimeout(res, 100));
      saga.dispatch(disconnectLobbyHub(sessionId));

      const results = await sagaRun;

      // search put for hubConnectedAction action
      const putEffects = results.effects.put;
      const hubConnectedAction = putEffects.find(
        (effect) => effect.payload.action.type === hubConnected.type
      );
      expect(hubConnectedAction?.payload?.action).toBeDefined();
      expect(mockHub.on).toHaveBeenCalledTimes(2);
      expect(mockHub.off).toHaveBeenCalledTimes(2);
    });

    it("should wait for connection if not disconnected", async () => {
      const sessionId = "test-session-123";
      mockHub.state = HubConnectionState.Connecting;

      const saga = expectSaga(lobbySaga).provide([
        [matchers.call(waitForHubConnected, mockHub), true],
      ]);
      const results = await saga.dispatch(connectLobbyHub(sessionId)).run();

      // search put for hubConnectedAction action
      const putEffects = results.effects.put;
      const hubConnectedAction = putEffects.find(
        (effect) => effect.payload.action.type === hubConnected.type
      );
      expect(hubConnectedAction?.payload?.action).toBeDefined();
    });
  });

  describe("joinLobbySaga", () => {
    it("Should join lobby", async () => {
      const mockMatchResults: MatchResults = {
        matches: [
          {
            id: "match-1",
            name: "Test Match",
            creatorId: "user-1",
            memberId: "",
            creatorConnectionId: "conn-1",
            memberConnectionId: "",
            creatorMoves: 0,
            memberMoves: 0,
            creatorStatus: 0,
            memberStatus: 0,
            nextTurn: 0,
            gameOutcome: -1,
            hasFinished: false,
            isBlocked: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        count: 1,
      };

      const mockInvoke = jest.fn().mockResolvedValue(mockMatchResults);
      mockHub.invoke = mockInvoke;

      const saga = expectSaga(lobbySaga);
      const result = await saga

        // mock select to return current user
        .provide({
          select() {
            return currentUser;
          },
        })
        .dispatch(joinLobby())
        .silentRun(1000);
      
        // assert invoke called with JoinLobby
      expect(mockInvoke).toHaveBeenCalledWith("JoinLobby");
      expect(mockInvoke).toHaveBeenCalledTimes(1);

      // search put for loadLatestMatches action
      const putEffects = result.effects.put;
      const loadMatchesAction = putEffects.find(
        (effect) => effect.payload.action.type === loadLatestMatches.type
      );

      // assert that current user and matches are in payload
      expect(loadMatchesAction).toBeDefined();
      expect(loadMatchesAction?.payload.action.payload.currentUser).toEqual(currentUser);
      expect(loadMatchesAction?.payload.action.payload.matches).toEqual(mockMatchResults.matches);
    });
  });

  describe("createMatchSaga", () => {
    it("Should create match", async () => {
      const newMatch = {
          name: "New Match",
        };
      const mockMatchResults: MatchResults = {
        matches: [
          {
            id: "match-1",
            name: "Test Match",
            creatorId: "user-1",
            memberId: "",
            creatorConnectionId: "conn-1",
            memberConnectionId: "",
            creatorMoves: 0,
            memberMoves: 0,
            creatorStatus: 0,
            memberStatus: 0,
            nextTurn: 0,
            gameOutcome: -1,
            hasFinished: false,
            isBlocked: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        count: 1,
      };

      const mockInvoke = jest.fn().mockResolvedValue(mockMatchResults);
      mockHub.invoke = mockInvoke;

      const saga = expectSaga(lobbySaga);
      const result = await saga

        // mock select to return current user
        .provide({
          select() {
            return currentUser;
          },
        })
        .dispatch(createMatch(newMatch))
        .silentRun(1000);
      
      // assert invoke called with CreateRoom
      expect(mockInvoke).toHaveBeenCalledWith("CreateRoom", newMatch);
      expect(mockInvoke).toHaveBeenCalledTimes(1);

      // search put for onMatchesCreated action
      const putEffects = result.effects.put;
      const onMatchesCreatedAction = putEffects.find(
        (effect) => effect.payload.action.type === onMatchesCreated.type
      );

      // assert that current user and matches are in payload
      expect(onMatchesCreatedAction).toBeDefined();
      expect(onMatchesCreatedAction?.payload.action.payload.currentUser).toEqual(currentUser);
      expect(onMatchesCreatedAction?.payload.action.payload.matches).toEqual(mockMatchResults.matches);
    });
  });
});
