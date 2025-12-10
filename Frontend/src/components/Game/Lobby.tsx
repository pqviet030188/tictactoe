import { useCallback, useEffect, type FC } from "react";
import { useNavigate } from "react-router-dom";
import { store, useAppSelector } from "../../store";
import { connectLobbyHub, createMatch, disconnectLobbyHub, joinRoomRequest } from "../../store/matchSlice";
import { MatchList } from "./MatchList";
import { v4 as uuidv4 } from 'uuid';
import type { Match } from "../../types";

export const Lobby: FC = () => {
  const navigate = useNavigate();
  const matches = useAppSelector((state) => state.match.displayedMatches);
  const owner = useAppSelector((state) => state.user.currentUser);
  
  const handleBackToMenu = useCallback(() => {
    navigate("/game");
  }, [navigate]);

  const makeMatch = useCallback(() => {
    store.dispatch(createMatch({
      name: "New Match",
    }));
  }, []);

  const onJoinMatch = useCallback((match: Match) => {
    store.dispatch(joinRoomRequest({
      match,
      user: owner!,
    }));
    
    navigate("/match");
  }, [navigate]);

  useEffect(() => {
    const id = uuidv4();
    store.dispatch(connectLobbyHub(id));
    return () => {
      store.dispatch(disconnectLobbyHub(id));
    };
  }, []);

  return (
    <div className="game-content">
      <button onClick={handleBackToMenu} className="back-button">
        Back to Menu
      </button>

      <button onClick={makeMatch} className="back-button">
        Create Match
      </button>
      <MatchList 
        owner={owner}
        matches={matches || []} 
        onJoinMatch={onJoinMatch}
      />
    </div>
  );
};
