using Microsoft.AspNetCore.SignalR;
using Tictactoe.DTOs;
using Tictactoe.Extensions;
using Tictactoe.Types.Attributes;
using Tictactoe.Types.Interfaces;

namespace Tictactoe.Hubs;

public class LobbyHub(IMatchRepository matchRepository): Hub, ILobbyHub
{
    public static string MatchsCreatedEvent = "MatchesCreated";
    public static string MatchesUpdatedEvent = "MatchesUpdated";

    public static string MatchNotificationGlobalGroup() => "matches";

    [UseAuthentication]
    public async Task<MatchResultsWithError> GetLatestMatches(MatchLoadingRequest request)
    {
        var userId = Context.User!.GetUserId();
        var latestMatchId = request.MatchId;
        var matches = await matchRepository.GetLatestMatches(userId, latestMatchId!, 10, Context.ConnectionAborted);
        return new MatchResultsWithError()
        {
            Matches = matches,
            Count = matches.Count(),
        };
    }

    [UseAuthentication]
    public async Task<MatchResultsWithError> GetOlderMatches(MatchLoadingRequest request)
    {
        var userId = Context.User!.GetUserId();
        var matchId = request.MatchId;
        var matches = await matchRepository.GetOlderMatches(userId, matchId!, 10, Context.ConnectionAborted);
        return new MatchResultsWithError()
        {
            Matches = matches,
            Count = matches.Count(),
        };
    }

    [UseAuthentication]
    public async Task<MatchResultsWithError> JoinLobby()
    {
        var globalRoomId = MatchNotificationGlobalGroup();

        // Join group or socket room 
        await Groups.AddToGroupAsync(Context.ConnectionId, globalRoomId, Context.ConnectionAborted);
        
        // return latest matches
        var matches = await matchRepository.GetLatestMatches(null, null, 10, Context.ConnectionAborted);
        return new MatchResultsWithError()
        {
            Matches = matches,
            Count = matches.Count(),
        };
    }

    [UseAuthentication]
    public async Task<ErrorResponse> ExitLobby()
    {
        var globalRoomId = MatchNotificationGlobalGroup();

        // Join group or socket room 
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, globalRoomId, Context.ConnectionAborted);

        // returns no error
        return new ErrorResponse();
    }

    [UseAuthentication]
    public async Task<MatchResultsWithError> CreateRoom(CreateRoomRequest request)
    {
        var userId = Context.User!.GetUserId();

        var newMatch = await matchRepository.Create(userId, request.Name, request.Password, Context.ConnectionAborted);

        // Inform every one that a room is created
        var globalRoomId = MatchNotificationGlobalGroup();
        await Clients.Group(globalRoomId).SendAsync(MatchsCreatedEvent, new MatchResults()
        {
            Matches = [newMatch],
            Count = 1
        }, Context.ConnectionAborted);

        return new MatchResultsWithError()
        {
            Matches = [newMatch],
            Count = 1
        };
    }
}