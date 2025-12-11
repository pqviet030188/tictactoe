import { useCallback, useEffect, type FC } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store";
import { connectLobbyHub, createMatch, disconnectLobbyHub, joinRoomRequest } from "../../store/matchSlice";
import { MatchList } from "./MatchList";
import { LoadingScreen } from "../LoadingScreen";
import { v4 as uuidv4 } from 'uuid';
import type { Match } from "../../types";
import { emptyArray } from "../../constants";
import "./Lobby.css";

export const Lobby: FC = () => {
  const navigate = useNavigate();
  const matches = useAppSelector((state) => state.match.displayedMatches);
  const owner = useAppSelector((state) => state.user.currentUser);
  const lobbyHubConnectionState = useAppSelector((state) => state.match.lobbyHubConnectionState);
  const dispatch = useAppDispatch();
  const isConnected = lobbyHubConnectionState === "channel_connected";
  const isReconnecting = 
    lobbyHubConnectionState === "channel_disconnected" 
    || lobbyHubConnectionState === "hub_reconnecting" 
    || lobbyHubConnectionState === "hub_closed";

  const isConnecting = lobbyHubConnectionState === "channel_connecting";

  useEffect(() => {
    if (lobbyHubConnectionState === "hub_closed") {
      navigate("/game");
    }
  }, [lobbyHubConnectionState, navigate]);

  const handleBackToMenu = useCallback(() => {
    navigate("/game");
  }, [navigate]);

  const makeMatch = useCallback(() => {
    if (!isConnected) return;
    
    dispatch(createMatch({
      name: "New Match",
    }));
  }, [dispatch, isConnected]);

  const onJoinMatch = useCallback((match: Match) => {
    if (!isConnected) return;
    
    dispatch(joinRoomRequest({
      match,
      user: owner!,
    }));

    navigate("/match");
  }, [dispatch, navigate, owner, isConnected]);

  useEffect(() => {
    const id = uuidv4();
    dispatch(connectLobbyHub(id));
    return () => {
      dispatch(disconnectLobbyHub(id));
    };
  }, [dispatch]);

  // Loading screen when connecting
  if (isConnecting || isReconnecting) {
    return (
      <LoadingScreen
        title="Connecting to Lobby..."
        message="Please wait while we establish connection"
      />
    );
  }

  return (
    <div className="lobby-container">
      <div className={`game-content ${isReconnecting ? 'disabled' : ''}`}>
        
        <button 
          onClick={handleBackToMenu} 
          className="back-button"
        >
          Back to Menu
        </button>

        <button 
          onClick={makeMatch} 
          className="back-button"
          disabled={!isConnected}
        >
          Create Match
        </button>

        {isConnected ? (
          <MatchList 
            owner={owner}
            matches={matches ?? emptyArray()} 
            onJoinMatch={onJoinMatch}
          />
        ) : (
          <div className="lobby-disconnected">
            <p>Unable to load matches. Please check your connection.</p>
          </div>
        )}
      </div>
    </div>
  );
};
