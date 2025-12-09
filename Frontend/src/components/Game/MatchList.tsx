import React from "react";
import { ePlayerStatus, type Match, type User } from "../../types";
import { MATCH_BUFFER_SIZE } from "../../store/matchSlice";

import "./MatchList.css";

interface MatchListProps {
  matches: Match[];
  owner?: User | null;
  onJoinMatch?: (match: Match) => void;
}

const isGameOpened = (match: Match) => {
  return match.creatorId == null || match.memberId == null;
};

const isGameFinished = (match: Match) => {
  return match.hasFinished;
};

const getStatusClass = (match: Match): string => {
  return isGameFinished(match)
    ? "finished"
    : isGameOpened(match)
    ? "open"
    : "in-progress";
};

const getPlayerCount = (match: Match): number => {
  return [
    [match.creatorConnectionId, match.creatorStatus],
    [match.memberConnectionId, match.memberStatus],
  ].filter((d) => d[0] != null && d[1] == ePlayerStatus.Joined).length;
};

const getRoomOwner = (match: Match, user?: User | null): string => {
  return match.creatorId == user?.id ? "You" : "Your mates";
};

const canJoinMatch = (
  match: Match,
  owner: User | null | undefined
): boolean => {
  console.log(match, owner, isGameOpened(match), isGameFinished(match));
  return (
    owner != null &&
    ((isGameOpened(match) &&
      (owner.id != match.creatorId || match.creatorStatus == ePlayerStatus.Left)) ||
      (!isGameFinished(match) &&
        ((match.memberId == owner?.id &&
          match.memberStatus == ePlayerStatus.Left) ||
          (match.creatorId == owner?.id &&
            match.creatorStatus == ePlayerStatus.Left))))
  );
};

const getMatchStatus = (match: Match): string => {
  return isGameFinished(match)
    ? "Finished"
    : isGameOpened(match)
    ? "Open"
    : "In Progress";
};

export const MatchList: React.FC<MatchListProps> = ({
  matches,
  owner,
  onJoinMatch,
}) => {
  if (matches.length === 0) {
    return (
      <div className="match-list-empty">
        <h3>No matches available</h3>
        <p>Create a new match to get started!</p>
      </div>
    );
  }

  return (
    <div className="match-list">
      <h2 className="match-list-title">
        Top {MATCH_BUFFER_SIZE} Available Matches
      </h2>
      <div className="match-list-header">
        <span className="match-name-header">Match ID</span>
        <span className="match-players-header">Players</span>
        <span className="match-owner-header">Owner</span>
        <span className="match-status-header">Status</span>
        <span className="match-actions-header">Action</span>
      </div>
      <div className="match-list-body">
        {matches.map((match) => {
          return (
            <div
              key={match.id}
              className={`match-row ${getStatusClass(match)}`}
            >
              <span className="match-name">{match.name}</span>
              <span className="match-players">{getPlayerCount(match)}/2</span>
              <span className="match-owner ">{getRoomOwner(match, owner)}</span>
              <span className={`match-status ${getStatusClass(match)}`}>
                {getMatchStatus(match)}
              </span>
              <div className="match-actions">
                {canJoinMatch(match, owner) && onJoinMatch ? (
                  <button
                    className="join-button"
                    onClick={() => onJoinMatch(match)}
                  >
                    Join
                  </button>
                ) : (
                  <span className="no-action">-</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
