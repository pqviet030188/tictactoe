using Microsoft.AspNetCore.SignalR;
using Tictactoe.Extensions;

namespace Tictactoe.Hubs;

public class LobbyHub: Hub
{
    public static string UserJoinLobbyEvent = "UserJoinLobby";
    public static string MatchsCreatedEvent = "MatchesCreated";
    public static string MatchesUpdatedEvent = "MatchesUpdated";

    public static string MatchNotificationGroup(string userId) => $"{userId}/matches";

    public async Task GetMatches(string user, string message)
    {
        await Clients.All.SendAsync("ReceiveMessage", user, message);
    }

    public async Task JoinLobbyRoom()
    {
        var userId = Context.User?.GetUserId();
        var roomId = MatchNotificationGroup(userId!);

        // Join group or socket room 
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

        // Notify the user joined
        await Clients.Group(roomId).SendAsync(UserJoinLobbyEvent, userId);
    }
}