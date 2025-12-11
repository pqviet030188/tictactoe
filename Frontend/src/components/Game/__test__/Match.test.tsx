import { BrowserRouter } from "react-router-dom";
import { Match } from "../../Game/Match";
import {
  eGameOutcome,
  eGameTurn,
  ePlayerStatus,
  eRoomActivity,
  type HubConnectionStatus,
  type MatchResults,
  type Match as MatchType,
  type RoomActivityUpdateResponse,
  type User,
} from "../../../types";
import { renderWithProviders } from "../../../testHelpers";
import { HubConnectionState } from "@microsoft/signalr";
import { act, fireEvent, waitFor } from "@testing-library/react";

jest.mock("../../../hubs", () => ({
  roomHub: {
    state: 0,
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    off: jest.fn(),
    invoke: jest.fn(),
    send: jest.fn(),
    onclose: jest.fn(),
    onreconnected: jest.fn(),
    onreconnecting: jest.fn(),
    connectionId: "test-connection-id",
  },
  lobbyHub: {
    state: 0,
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    off: jest.fn(),
    invoke: jest.fn(),
  },
}));

const hubConnectionId = "test-connection-id";

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

const generateInitState = (match: MatchType, user: User) => {
  return {
    user: {
      currentUser: user,
      error: null,
      loading: false,
      login: {
        error: null,
        loading: false,
        success: true,
      },
      users: {},
    },
    match: {
      currentMatch: {
        match: match,
        roomState: "joining" as "joining" | "joined" | "closed",
        hubConnectionState: "channel_connecting" as HubConnectionStatus,
        userId: user.id,
        sessionId: "session-123",
      },
      joiningLobby: false,
      joiningMatch: false,
      lobbyError: null,
      matchError: null,
      matches: {},
    },
  };
};

const generateInvokeMock = (match: MatchType) => {
  return jest.fn().mockImplementation((method, data) => {
    if (
      method === "UpdateRoomActivity" &&
      data.roomActivity === eRoomActivity.JoinRoom
    ) {
      return Promise.resolve({
        match: {
          ...match,
          creatorStatus: ePlayerStatus.Joined,
          creatorConnectionId: "test-connection-id",
        },
      } as RoomActivityUpdateResponse);
    } else if (
      method === "UpdateRoomActivity" &&
      data.roomActivity === eRoomActivity.LeaveRoom
    ) {
      return Promise.resolve({
        match: {
          ...match,
          creatorStatus: ePlayerStatus.Left,
          creatorConnectionId: "test-connection-id",
        },
      } as RoomActivityUpdateResponse);
    } else if (
      method === "UpdateRoomActivity" &&
      data.roomActivity === eRoomActivity.MakeMove
    ) {
      return Promise.resolve({
        match: {
          ...match,
          creatorStatus: ePlayerStatus.Joined,
          creatorConnectionId: "test-connection-id",
          creatorMoves: data.move,
          nextTurn: eGameTurn.Member,
        },
      } as RoomActivityUpdateResponse);
    }

    return Promise.resolve({} as RoomActivityUpdateResponse);
  });
};

const generateEventRegisterMock = () => {
  const memory: Record<string, (...args: any[]) => void> = {};
  const trigger = (eventName: string, ...args: any[]) => {
    if (memory[eventName]) {
      memory[eventName](...args);
    }
  };

  const on = jest.fn().mockImplementation((methodName, callback) => {
    memory[methodName] = callback;
  });

  return {
    trigger,
    on,
  };
};
describe("Match Component", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockHub: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const { roomHub } = await import("../../../hubs");
    mockHub = roomHub;
    mockHub.state = HubConnectionState.Disconnected;
    mockHub.connectionId = hubConnectionId;
  });

  it("Display turn and moves between players correctly", async () => {
    // create mock user, and match
    const { match, user } = generateMockMatchAndUser();
    const initState = generateInitState(match, user);
    mockHub.invoke = generateInvokeMock(match);
    const { on, trigger } = generateEventRegisterMock();
    mockHub.on = on;

    // render the component
    const renderer = renderWithProviders(
      <BrowserRouter>
        <Match />
      </BrowserRouter>,
      {
        preloadedState: initState,
      }
    );

    // Wait for join room to be invoked
    await waitFor(() => {
      expect(mockHub.invoke).toHaveBeenCalledWith(
        "UpdateRoomActivity",
        expect.objectContaining({
          roomActivity: eRoomActivity.JoinRoom,
          roomId: match.id,
        })
      );
    });

    // Verify initial state and UI elements
    expect(renderer.getByText(`Match: ${match.name}`)).toBeVisible();
    expect(renderer.getByText(`Your turn`)).toBeVisible();

    // Get the first, and second square button element of the board
    const firstSquare = renderer.container.querySelectorAll(
      "button.game-cell"
    )[0] as HTMLButtonElement;
    const secondSquare = renderer.container.querySelectorAll(
      "button.game-cell"
    )[1] as HTMLButtonElement;
    expect(firstSquare).toBeVisible();
    expect(secondSquare).toBeVisible();

    // Click the first square to make a move
    await act(async () => {
      fireEvent.click(firstSquare);
      
      // Give saga time to process
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Wait for the make move to be invoked
    await waitFor(() => {
      expect(mockHub.invoke).toHaveBeenCalledWith(
        "UpdateRoomActivity",
        expect.objectContaining({
          roomActivity: eRoomActivity.MakeMove,
          roomId: match.id,
          move: 1 << 8,
        })
      );
    });

    // Verify that after making the move, it's now opponent's turn
    await waitFor(() => {
      expect(renderer.getByText(`Opponent turn`)).toBeVisible();
      expect(firstSquare).toHaveTextContent("X");
    });

    // Simulate receiving a MatchUpdatedEvent from the hub for opponent's move
    const currentMatchState =
      renderer.store.getState().match.currentMatch?.match;
    await act(async () => {
      trigger("MatchUpdatedEvent", {
        count: 1,
        matches: [
          {
            ...currentMatchState,

            memberMoves: 1 << 7,
            nextTurn: eGameTurn.Creator,
          },
        ],
      } as MatchResults);
    });

    // Verify that after opponent's move, it's now player's turn again
    await waitFor(() => {
      expect(renderer.getByText(`Your turn`)).toBeVisible();
      expect(firstSquare).toHaveTextContent("X");
      expect(secondSquare).toHaveTextContent("O");
    });

    // take snapshot
    expect(renderer.container).toMatchSnapshot();
  });
});
