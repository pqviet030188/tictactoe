import React, { useCallback, useEffect, useState } from "react";
import { GameMenu } from "../GameMenu";
import "./Game.css";
import { useNavigate } from "react-router-dom";

type GameMode = "menu" | "vsCpu" | "vsPlayer";

export const Game: React.FC = () => {
  const [gameMode, setGameMode] = useState<GameMode>("menu");
  const navigate = useNavigate();

  const handleGameModeSelect = useCallback((mode: "vsCpu" | "vsPlayer") => {
    setGameMode(mode);
  }, []);

  useEffect(() => {
    if (gameMode === "vsCpu") {
      navigate("/solo");
    } else if (gameMode === "vsPlayer") {
      navigate("/lobby");
    }
  }, [navigate, gameMode]);

  return (
    <div className="game-container">
      <GameMenu onGameModeSelect={handleGameModeSelect} />
    </div>
  );
};
