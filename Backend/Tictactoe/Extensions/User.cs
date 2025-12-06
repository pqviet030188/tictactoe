using System.Security.Claims;

namespace Tictactoe.Extensions;

public static class User
{
    public static string GetUserId(this ClaimsPrincipal claimsPrincipal)
    {
        return claimsPrincipal?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "test";
    }
}