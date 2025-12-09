using Microsoft.AspNetCore.SignalR;
using Tictactoe.DTOs;
using Tictactoe.Extensions;
using Tictactoe.Helpers;
using Tictactoe.Types.Attributes;
using Tictactoe.Types.Interfaces;

namespace Tictactoe.Hubs;

public class LobbyHub(IMatchRepository matchRepository): Hub, ILobbyHub
{
    public static string MatchsCreatedEvent = "MatchesCreated";
    public static string MatchesUpdatedEvent = "MatchesUpdated";

    public static string MatchNotificationGlobalGroup() => "matches";

    private const int DefaultMatchLoadCount = 10;

    [UseAuthentication]
    public async Task<MatchResultsWithError> GetLatestMatches(MatchLoadingRequest request)
    {
        var userId = Context.User!.GetUserId();
        var latestMatchId = request.MatchId;
        var matches = await matchRepository.GetLatestMatches(userId, latestMatchId!, DefaultMatchLoadCount, Context.ConnectionAborted);
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
        var matches = await matchRepository.GetOlderMatches(userId, matchId!, DefaultMatchLoadCount, Context.ConnectionAborted);
        return new MatchResultsWithError()
        {
            Matches = matches,
            Count = matches.Count(),
        };
    }

    [UseAuthentication]
    public async Task<MatchResultsWithError> JoinLobby()
    {
        var userId = Context.User!.GetUserId();
        var globalRoomId = MatchNotificationGlobalGroup();

        // Join group or socket room 
        await Groups.AddToGroupAsync(Context.ConnectionId, globalRoomId, Context.ConnectionAborted);
        
        // return latest matches
        var matches = await matchRepository.GetLatestMatches(userId, null, DefaultMatchLoadCount, Context.ConnectionAborted);
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

        // We don't take the room name from user for now to simplify things
        var newMatchName = RoomEncodingHelper.GenerateId();

        var newMatch = await matchRepository.Create(userId, newMatchName, request.Password, Context.ConnectionAborted);

        // Inform everyone that a room is created
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