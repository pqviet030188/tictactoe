import {
  createSlice,
  type PayloadAction,
  type WritableDraft,
} from "@reduxjs/toolkit";
import {
  type CreateMatchRequest,
  type HubConnectionStatus,
  type Match,
  type MatchResults,
  type User,
  eGameOutcome,
  eGameTurn,
} from "../types";
import _ from "lodash";
interface MatchState {
  matches: Record<string, Match>; // map of matchId to Match
  currentMatch: {
    userId: string;
    sessionId: string;
    roomState: "joining" | "joined" | "closed",
    hubConnectionState: HubConnectionStatus,
    match: Match;
  } | null;
  joiningLobby: boolean;
  joiningMatch: boolean;
  lobbyError: string | null;
  matchError: string | null;
  displayedMatches?: Match[];
  lobbyHubConnectionState?: HubConnectionStatus;
}

const defaultDisplayMatches = [] as Match[];
const initialState: MatchState = {
  matches: {},
  currentMatch: null,
  lobbyError: null,
  matchError: null,
  joiningLobby: false,
  joiningMatch: false,
  displayedMatches: defaultDisplayMatches,
};

export const MATCH_BUFFER_SIZE = 10;

const updateMatchesAndPickTop10LatestUnfinishedOnes = (
  state: WritableDraft<MatchState>,
  action: PayloadAction<
    MatchResults & {
      currentUser?: User | null;
    }
  >
) => {
  action.payload.matches.forEach((match) => {
    state.matches[match.id] = match;
  });

  state.displayedMatches?.unshift(...action.payload.matches);
  state.displayedMatches = _.uniqBy(state.displayedMatches, "id");
  state.displayedMatches = _.orderBy(
    state.displayedMatches,
    (m) => new Date(m.createdAt).getTime(),
    "desc"
  );
  state.displayedMatches = state.displayedMatches
    ?.filter((d) => {
      return (
        d.memberId == null || // only show open matches
        !action.payload.currentUser ||
        // only show matches where current user is a participant or the game is still going on
        (d.creatorId == action.payload.currentUser.id &&
          d.gameOutcome == eGameOutcome.Going) ||
        (d.memberId == action.payload.currentUser.id &&
          d.gameOutcome == eGameOutcome.Going)
      );
    })
    ?.slice(0, MATCH_BUFFER_SIZE);

  return state;
};

// idea for infinite scrolling, however keep it simple for now
export const matchSlice = createSlice({
  name: "match",
  initialState,
  reducers: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    connectLobbyHub(state, _2: PayloadAction<string>) {
      state.lobbyHubConnectionState = "channel_connecting";
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    disconnectLobbyHub(state, _2: PayloadAction<string>) {
      // technically, it's not disconnected yet, but attempting
      state.lobbyHubConnectionState = "channel_disconnected";
    },
    hubConnected(state) {
      state.lobbyHubConnectionState = "channel_connected";
    },
    hubConnectionStatusUpdate(state, action: PayloadAction<HubConnectionStatus>) {
      state.lobbyHubConnectionState = action.payload;
    },
    joinLobby() {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    createMatch(_1, _2: PayloadAction<CreateMatchRequest>) {},

    // close the match without sending leaving signal to server
    closeMatch(state, action: PayloadAction<string>) {
      if (state.currentMatch?.match.id != action.payload) {
        return;
      }

      state.currentMatch.roomState = "closed";
    },

    acceptJoin(state, action: PayloadAction<string>) {
      if (state.currentMatch?.match.id != action.payload) {
        return;
      }

      state.currentMatch.roomState = "joined";
    },

    onMatchesCreated: updateMatchesAndPickTop10LatestUnfinishedOnes,
    onMatchesUpdated: updateMatchesAndPickTop10LatestUnfinishedOnes,
    updateLatestMatches: updateMatchesAndPickTop10LatestUnfinishedOnes,
    updateOldestMatches: updateMatchesAndPickTop10LatestUnfinishedOnes,
    loadLatestMatches(
      state,
      action: PayloadAction<
        MatchResults & {
          currentUser?: User | null;
        }
      >
    ) {
      state.matches = {};
      state.displayedMatches = [];
      const nState = updateMatchesAndPickTop10LatestUnfinishedOnes(
        state,
        action
      );
      state.displayedMatches = nState.displayedMatches;
      state.matches = nState.matches;
    },
    lobbyError(state, action: PayloadAction<string>) {
      state.lobbyError = action.payload;
    },
    matchError(state, action: PayloadAction<string>) {
      state.matchError = action.payload;
    },
    joinRoomRequest(state, action: PayloadAction<{match: Match, user: User}>) {
      state.currentMatch = {
        match: action.payload.match,
        sessionId: "",
        userId: action.payload.user.id,
        roomState: "joining",
        hubConnectionState: "channel_connecting",
      };
    },
    
    updateRoomSession(
      state,
      action: PayloadAction<{ matchId: string; sessionId: string }>
    ) {
      if (
        action.payload != null &&
        state.currentMatch?.match?.id == action.payload?.matchId
      ) {
        state.currentMatch.sessionId = action.payload.sessionId;
      }
    },
    onRoomActivityUpdated(
      state,
      action: PayloadAction<Match | null | undefined>
    ) {
      if (
        action.payload != null &&
        state.currentMatch?.match?.id == action.payload?.id
      ) {
        state.currentMatch.match = action.payload;
      }
    },
    connectRoomHub(
      state,
      action: PayloadAction<{
        matchId: string;
        sessionId: string;
      }>
    ) {
      if (state.currentMatch?.match?.id == action.payload.matchId) {
        state.currentMatch.sessionId = action.payload.sessionId;
      }
    },
    disconnectRoomHub(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _1,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _2: PayloadAction<{
        matchId: string;
        sessionId: string;
      }>
    ) {},
    roomHubStatusUpdate(
      state,
      action: PayloadAction<{
        matchId: string;
        sessionId: string;
        status: "connected" | "disconnected" | "hub_reconnecting" | "hub_closed";
      }>
    ) {
      if (
        state.currentMatch?.match?.id != action.payload.matchId ||
        state.currentMatch?.sessionId != action.payload.sessionId
      ) {
        return;
      }

      if (action.payload.status === "connected")
      {
        state.currentMatch.hubConnectionState = "channel_connected";  
      }
      else if (action.payload.status === "disconnected")
      {
        state.currentMatch.hubConnectionState = "channel_disconnected";  
      } else if (action.payload.status === "hub_reconnecting")
      {
        state.currentMatch.hubConnectionState = "hub_reconnecting";  
      } else if (action.payload.status === "hub_closed")
      {
        state.currentMatch.hubConnectionState = "hub_closed";  
      }
    },

    makeMove(
      state,
      action: PayloadAction<{ matchId: string; move: number; userId: string }>
    ) {
      if (!state.currentMatch?.match || !action.payload.userId) {
        return;
      }

      // Update moves and next turn
      if (state.currentMatch?.match?.creatorId == action.payload?.userId) {
        state.currentMatch.match.creatorMoves = action.payload.move;
        state.currentMatch.match.nextTurn = eGameTurn.Member;
      } else if (
        state.currentMatch?.match?.memberId == action.payload?.userId
      ) {
        state.currentMatch.match.memberMoves = action.payload.move;
        state.currentMatch.match.nextTurn = eGameTurn.Creator;
      }

    },
    onCurrentMatchUpdatedEvent(state, action: PayloadAction<MatchResults>) {
      const match = action.payload.matches?.[0];
      if (!match || state.currentMatch?.match?.id !== match.id) return;
      state.currentMatch.match = match;
    },
  },
});

export const {
  joinLobby,
  hubConnected,
  hubConnectionStatusUpdate,
  loadLatestMatches,
  connectLobbyHub,
  lobbyError,
  disconnectLobbyHub,
  createMatch,
  closeMatch,
  acceptJoin,
  makeMove,
  updateRoomSession,
  onMatchesUpdated,
  onMatchesCreated,
  updateLatestMatches,
  updateOldestMatches,
  connectRoomHub,
  disconnectRoomHub,
  matchError,
  roomHubStatusUpdate,
  onCurrentMatchUpdatedEvent,
  onRoomActivityUpdated,
  joinRoomRequest,
} = matchSlice.actions;
export const matchReducer = matchSlice.reducer;

// Selectors
export const selectMatches = (state: { match: MatchState }) =>
  state.match.displayedMatches;
export const selectMatchError = (state: { match: MatchState }) =>
  state.match.matchError;
export const selectLobbyError = (state: { match: MatchState }) =>
  state.match.lobbyError;
export const selectJoiningMatch = (state: { match: MatchState }) =>
  state.match.joiningMatch;
export const selectJoiningLobby = (state: { match: MatchState }) =>
  state.match.joiningLobby;
