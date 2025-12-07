using Tictactoe.DTOs;

namespace Tictactoe.Types.Interfaces;

public interface ILobbyHub
{
    Task<MatchResultsWithError> GetLatestMatches(MatchLoadingRequest request);
    Task<MatchResultsWithError> GetOlderMatches(MatchLoadingRequest request);
    Task<MatchResultsWithError> JoinLobby();
    Task<ErrorResponse> ExitLobby();
    Task<MatchResultsWithError> CreateRoom(CreateRoomRequest request);
}