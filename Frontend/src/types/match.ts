export const ePlayerStatus = Object.freeze({
  Joined: 0,
  Left: 1,
});

type PlayerStatus = (typeof ePlayerStatus)[keyof typeof ePlayerStatus];

export const eGameTurn = Object.freeze({
  Creator: 0,
  Member: 1,
});

export type GameTurn = (typeof eGameTurn)[keyof typeof eGameTurn];

export const eGameOutcome = Object.freeze({
  Going: -1,
  Draw: 0,
  CreatorWin: 1,
  PlayerWin: 2,
});

export type GameOutcome = (typeof eGameOutcome)[keyof typeof eGameOutcome];

export const eRoomActivity = Object.freeze({
  MakeMove: 0,
  LeaveRoom: 1,
  JoinRoom: 2,
});

type RoomActivity = (typeof eRoomActivity)[keyof typeof eRoomActivity];

export interface Match {
  id: string;
  name: string;
  creatorId: string;
  memberId: string;
  creatorConnectionId: string;
  memberConnectionId: string;
  creatorStatus: PlayerStatus;
  memberStatus: PlayerStatus;
  creatorMoves: number;
  memberMoves: number;
  nextTurn: GameTurn;
  createdAt: string;
  updatedAt: string;
  gameOutcome: GameOutcome;
  hasFinished: boolean;
  isBlocked: boolean;
}

export interface MatchResults {
  matches: Match[];
  count: number;
}

export interface RoomActivityUpdateResponse {
    match?: Match | null,
    error?: {
        errorMessage: string;
        errorCode: string;
        errorDetailMessage: string;
    }
}

export interface RoomActivityUpdateRequest {
    roomId: string;
    roomActivity: RoomActivity;
    move?: number;
}

export interface CreateMatchRequest {
  name: string;
}

export interface WSInvokeOutput<T> {
  isCanceled: boolean;
  isCompleted: boolean;
  isCompletedSuccessfully: boolean;
  isFaulted: boolean;
  result: T | null;
}
