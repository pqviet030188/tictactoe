import { useCallback, useEffect, useMemo } from "react";
import { eGameOutcome, eGameTurn } from "../../types";
import "./CMatch.css";
import { store, useAppSelector } from "../../store";
import { useNavigate } from "react-router-dom";
import {
  connectRoomHub,
  disconnectRoomHub,
  makeMove,
} from "../../store/matchSlice";
import { v4 as uuidv4 } from "uuid";
import { Board } from "./Board";

export const CMatch = () => {
  const user = useAppSelector((state) => state.user.currentUser);
  const match = useAppSelector((state) => state.match.currentMatch?.match);

  const navigate = useNavigate();

  useEffect(() => {
    const id = uuidv4();
    store.dispatch(
      connectRoomHub({
        matchId: match?.id || "",
        sessionId: id,
      })
    );

    return () => {
      store.dispatch(
        disconnectRoomHub({
          matchId: match?.id || "",
          sessionId: id,
        })
      );
    };
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/game");
    }
  }, [user]);

  useEffect(() => {
    if (!match) {
      navigate("/lobby");
    }
  }, [match]);

  const onLeaveGame = useCallback(() => {
    navigate("/lobby");
  }, [navigate]);

  const getGameStatus = useMemo(() => {
    if (user == null) {
      return "You are not logged in";
    }

    if (match?.gameOutcome === eGameOutcome.Draw) {
      return "Draw game";
    }

    if (match?.gameOutcome == eGameOutcome.CreatorWin) {
      return match?.creatorId === user?.id ? "You won!" : "You lost!";
    }

    if (match?.gameOutcome == eGameOutcome.PlayerWin) {
      return match?.memberId === user?.id ? "You won!" : "You lost!";
    }

    if (match?.creatorId == null || match?.memberId == null) {
      return "Waiting for opponent";
    }

    if (match.nextTurn == eGameTurn.Creator) {
      return match.creatorId === user?.id ? "Your turn" : "Opponent turn";
    }

    if (match.nextTurn == eGameTurn.Member) {
      return match.memberId === user?.id ? "Your turn" : "Opponent turn";
    }

    return "Enjoy the game";
  }, [match, user]);

  const getGameStatusClass = useMemo(() => {
    if (user == null) {
      return "waiting";
    }

    if (match?.gameOutcome === eGameOutcome.Draw) {
      return "draw";
    }

    if (match?.gameOutcome == eGameOutcome.CreatorWin) {
      return match?.creatorId === user?.id ? "won" : "lost";
    }

    if (match?.gameOutcome == eGameOutcome.PlayerWin) {
      return match?.memberId === user?.id ? "won" : "lost";
    }

    if (match?.creatorId == null || match?.memberId == null) {
      return "waiting";
    }

    if (match.nextTurn == eGameTurn.Creator) {
      return match.creatorId === user?.id ? "my-turn" : "opponent-turn";
    }

    if (match.nextTurn == eGameTurn.Member) {
      return match.memberId === user?.id ? "my-turn" : "opponent-turn";
    }

    return "waiting";
  }, [match, user]);

  const onMoveClick = useCallback(
    (move: number) => {
      if (match == null || user == null) {
        return;
      }
      store.dispatch(
        makeMove({
          matchId: match.id,
          move: move,
          userId: user.id,
        })
      );
    },
    [match, user]
  );

  const myTurn = useMemo(() => {
    if (match == null || user == null) {
      return null;
    }
    return match.creatorId === user.id ? eGameTurn.Creator : eGameTurn.Member;
  }, [match, user]);

  return (
    <div className="cgame-container">
      <div className="cgame-header">
        <h1 className="welcome-message">Welcome, {user?.email}!</h1>
        <button onClick={onLeaveGame} className="leave-button">
          Leave Game
        </button>
      </div>

      <div className="cgame-content">
        <div className={`game-status ${getGameStatusClass}`}>
          {getGameStatus}
        </div>

        <div className="game-info">
          <h3>Match: {match?.name}</h3>
        </div>

        <Board
          myMoveDisplay={myTurn == eGameTurn.Creator ? "X" : "O"}
          isFinished={match != null && match.hasFinished}
          isMyTurn={
            myTurn != null && match != null 
            && match.memberId != null && match.creatorId != null
            && match.nextTurn === myTurn 
          }
          myMove={
            !match
              ? 0
              : myTurn == eGameTurn.Creator
              ? match.creatorMoves
              : match.memberMoves
          }
          oppMove={
            !match
              ? 0
              : myTurn == eGameTurn.Creator
              ? match?.memberMoves
              : match?.creatorMoves
          }
          onMakeMove={onMoveClick}
        />
      </div>
    </div>
  );
};
