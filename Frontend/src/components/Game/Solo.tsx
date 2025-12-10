import { useCallback, useEffect, useMemo, useState, type FC } from "react";
import { useNavigate } from "react-router-dom";
import "./Match.css";
import { useAppSelector } from "../../store";
import {
  eGameOutcome,
  eGameTurn,
  type ComputeResponse,
  type GameOutcome,
  type GameTurn,
} from "../../types";
import { Board } from "./Board";
import { gameApi } from "../../api";

const myTurn: GameTurn = eGameTurn.Creator;
export const Solo: FC = () => {
  const user = useAppSelector((state) => state.user.currentUser);
  const [myMoves, setMyMoves] = useState<number>(0);
  const [oppMoves, setOppMoves] = useState<number>(0);
  const [winStatus, setWinStatus] = useState<number>(10);
  const gameOutcome = useMemo<GameOutcome>(() => {
    return winStatus == 0
      ? eGameOutcome.Draw
      : winStatus == 1
      ? eGameOutcome.CreatorWin
      : winStatus == -1
      ? eGameOutcome.PlayerWin
      : eGameOutcome.Going;
  }, [winStatus]);

  const [nextTurn, setNextTurn] = useState<GameTurn>
  (
    eGameTurn.Creator
  );

  const navigate = useNavigate();

  const update = useCallback(
    async (myMoves: number, oppMoves: number) => {
      try {
        setMyMoves(myMoves);
        setNextTurn(eGameTurn.Member);
        const result = await gameApi.computeMove({
          playerMoves: myMoves,
          cpuMoves: oppMoves,
        }).then(d=>{
          return new Promise<ComputeResponse>((resolve)=>{
            setTimeout(()=>(resolve(d)), 200);
          })
        });

        setOppMoves((d) => d | result.nextMove);
        setMyMoves(myMoves);

        setWinStatus(result.win);
        setNextTurn(eGameTurn.Creator);
      } catch (error) {
        console.error("Error computing move:", error);
      }
    },
    [setOppMoves, setMyMoves, setWinStatus]
  );

  const onMoveClick = useCallback((move: number) => {
    update(move, oppMoves);
  }, [oppMoves, update]);

  useEffect(() => {
    if (!user) {
      navigate("/game");
    }
  }, [user, navigate]);

  const onLeaveGame = useCallback(() => {
    navigate("/game");
  }, [navigate]);

  const getGameStatus = useMemo(() => {
    if (user == null) {
      return "You are not logged in";
    }

    if (gameOutcome === eGameOutcome.Draw) {
      return "Draw game";
    }

    if (gameOutcome == eGameOutcome.CreatorWin) {
      return "You won!";
    }

    if (gameOutcome == eGameOutcome.PlayerWin) {
      return "You lost!";
    }

    if (nextTurn == myTurn) {
      return "Your turn";
    }

    return "Opponent turn";
  }, [nextTurn, user, gameOutcome]);

  const getGameStatusClass = useMemo(() => {
    if (user == null) {
      return "waiting";
    }

    if (gameOutcome === eGameOutcome.Draw) {
      return "draw";
    }

    if (gameOutcome == eGameOutcome.CreatorWin) {
      return "won";
    }

    if (gameOutcome == eGameOutcome.PlayerWin) {
      return "lost";
    }

    if (nextTurn == myTurn) {
      return "my-turn";
    }

    return "opponent-turn";
  }, [user, gameOutcome, nextTurn]);

  const hasFinished = useMemo(()=>{
    return gameOutcome != eGameOutcome.Going;
  }, [gameOutcome]);

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

        <Board
          myMoveDisplay={"X"}
          isFinished={hasFinished}
          isMyTurn={nextTurn === myTurn}
          myMove={myMoves}
          oppMove={oppMoves}
          onMakeMove={onMoveClick}
        />
      </div>
    </div>
  );
};
