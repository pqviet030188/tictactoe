using Microsoft.AspNetCore.SignalR;

namespace Tictactoe.Services;

public class SignalRHub: Hub
{
    // Example: Send message to all clients
    public async Task SendMessage(string user, string message)
    {
        await Clients.All.SendAsync("ReceiveMessage", user, message);
    }
}