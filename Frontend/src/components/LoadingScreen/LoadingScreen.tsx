import React from "react";
import "./LoadingScreen.css";

interface LoadingScreenProps {
  title?: string;
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  title = "Loading...",
  message = "Please wait",
}) => {
  return (
    <div className="loading-screen-container">
      <div className="loading-screen-content">
        <div className="loading-spinner"></div>
        <h2>{title}</h2>
        <p>{message}</p>
      </div>
    </div>
  );
};
