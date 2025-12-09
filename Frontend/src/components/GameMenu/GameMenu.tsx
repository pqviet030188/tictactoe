import React, { useCallback } from "react";
import { useCurrentUser } from "../../hooks";
import "./GameMenu.css";
import { useNavigate } from "react-router-dom";
import { logout, store } from "../../store";

interface GameMenuProps {
  onGameModeSelect: (mode: "vsCpu" | "vsPlayer") => void;
}

export const GameMenu: React.FC<GameMenuProps> = ({ onGameModeSelect }) => {
  const { currentUser } = useCurrentUser();
  const navigate = useNavigate();
  
  const handleVsCPU = useCallback(() => {
    onGameModeSelect("vsCpu");
  }, [onGameModeSelect]);

  const handleVsPlayer = useCallback(() => {
    onGameModeSelect("vsPlayer");
  }, [onGameModeSelect]);

  const handleLogout = useCallback(() => {
    store.dispatch(logout());
  }, [navigate]);

  return (
    <div className="game-menu-container">
      {/* Welcome message at top left */}
      <div className="welcome-section">
        <h2 className="welcome-text">
          Welcome back, {currentUser?.email}!
          <br />
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </h2>
      </div>

      {/* Game menu in the center */}
      <div className="menu-section">
        <div className="game-title">
          <h1>Tic Tac Toe</h1>
        </div>

        <div className="menu-buttons">
          <button className="menu-button vs-cpu-button" onClick={handleVsCPU}>
            vs CPU
          </button>

          <button
            className="menu-button vs-player-button"
            onClick={handleVsPlayer}
          >
            vs Player
          </button>
        </div>
      </div>
    </div>
  );
};
