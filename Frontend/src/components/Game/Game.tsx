import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TicTacToeGame } from '../TicTacToeGame';
import { authApi } from '../../api';
import { useCurrentUser } from '../../hooks';
import './Game.css';

export const Game: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();

  const handleLogout = () => {
    authApi.logout();
    navigate('/');
  };

  return (
    <div className="game-container">
      <div className="game-header">
        <h1 className="welcome-message">
          Welcome back, {currentUser?.email}!
        </h1>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
      
      <TicTacToeGame />
    </div>
  );
};