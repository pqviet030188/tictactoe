using Microsoft.AspNetCore.SignalR;
using Tictactoe.DTOs;
using Tictactoe.Services;
using Tictactoe.Extensions;
using Tictactoe.Types.Enums;
using Tictactoe.Types.Interfaces;
using Tictactoe.Types.Attributes;

namespace Tictactoe.Hubs;

public class RoomHub(IMatchRepository matchRepository) : Hub, IRoomHub
{
    public static string UserJoinMatch = "UserJoinMatch";
    public static string MatchUpdatedEvent = "MatchUpdatedEvent";

    public static string MatchNotificationGroup(string matchId) => $"match_{matchId}";

    private async Task<RoomActivityUpdateResponse> UpdateRoomStatus(
        string userId, string matchId, 
        PlayerStatus status,
        CancellationToken cancellationToken = default)
    {
        // Update status
        var match = await matchRepository.UpdatePlayer(matchId, userId, status, cancellationToken);

        if (match == null)
        {
            return new RoomActivityUpdateResponse()
            {
                Match = null,
                Error = RoomErrorCatalog.InvalidMatchOperation("Please check if you are part of the match.")
            };
        }

        var roomId = MatchNotificationGroup(matchId);
        var globalRoomId = LobbyHub.MatchNotificationGlobalGroup();

        // Add/Remove user to room to receive messages
        if (status == PlayerStatus.Joined)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        }
        else
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
        }

        // Notify local room
        await Clients.Group(roomId).SendAsync(MatchUpdatedEvent, new MatchResults()
        {
            Matches = [match],
            Count = 1
        });

        // Notify global lobby
        await Clients.Group(globalRoomId).SendAsync(LobbyHub.MatchesUpdatedEvent, new MatchResults()
        {
            Matches = [match],
            Count = 1
        }, cancellationToken);

        return new RoomActivityUpdateResponse()
        {
            Match = match,
        };
    }

    private async Task<RoomActivityUpdateResponse> MakeMove(
        string userId, string matchId, ushort move,
        CancellationToken cancellationToken = default)
    {
        var match = await matchRepository.GetById(userId, matchId, cancellationToken);
        if (match == null)
        {
            return new RoomActivityUpdateResponse()
            {
                Match = null,
                Error = RoomErrorCatalog.MatchNotFound(matchId)
            };
        }

        // Decide if win
        var isCreator = match.CreatorId == userId? true: false;
        var oppMoves = isCreator? match.MemberMoves: match.CreatorMoves;

        var win = move.Won(oppMoves);

        var roomId = MatchNotificationGroup(matchId);
        var globalRoomId = LobbyHub.MatchNotificationGlobalGroup();

        // Update status
        match = await matchRepository.UpdatePlayer(matchId, userId, move, 
            win == 0? GameOutcome.Draw: 
            win == 1? isCreator? GameOutcome.CreatorWin: GameOutcome.PlayerWin: 
            win == -1? isCreator? GameOutcome.PlayerWin: GameOutcome.CreatorWin: GameOutcome.Going, 
            cancellationToken);

        // Notify local room
        await Clients.Group(roomId).SendAsync(MatchUpdatedEvent, new MatchResults()
        {
            Matches = [match],
            Count = 1
        });

        // Notify global lobby
        await Clients.Group(globalRoomId).SendAsync(LobbyHub.MatchesUpdatedEvent, new MatchResults()
        {
            Matches = [match],
            Count = 1
        }, cancellationToken);

        return new RoomActivityUpdateResponse()
        {
            Match = match,
        };
    }

    [UseAuthentication]
    [UseRoomAuthorisation]
    public async Task<RoomActivityUpdateResponse> UpdateRoomActivity(RoomActivityUpdateRequest request)
    {
        var userId = Context.User!.GetUserId();

        if (request.RoomActivity == RoomActivity.JoinRoom || request.RoomActivity == RoomActivity.LeaveRoom)
        {
            return await UpdateRoomStatus(userId, request.RoomId, 
                request.RoomActivity == RoomActivity.JoinRoom? PlayerStatus.Joined: PlayerStatus.Left,
                Context.ConnectionAborted
            );
        }

        if (request.RoomActivity == RoomActivity.MakeMove && request.Move != null)
        {
            return await MakeMove(userId, request.RoomId, request.Move.Value, Context.ConnectionAborted);
        }

        return new RoomActivityUpdateResponse()
        {
            Match = null,
            Error = RoomErrorCatalog.InvalidMatchOperation($"The activity kind is not enabled.")
        };
    }
}