using Microsoft.AspNetCore.SignalR;
using Tictactoe.Types.Interfaces;

namespace Tictactoe.Services;

public class SignalRHub(IMatchRepository matchRepository): Hub
{
    // Example: Send message to all clients
    public async Task<string> SendMessage(string user, string message)
    {
        await Clients.All.SendAsync("ReceiveMessage", user, message);
        return "Message sent";
    }
}