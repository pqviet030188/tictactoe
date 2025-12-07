using Tictactoe.Models;

namespace Tictactoe.Types.Interfaces;

public interface ITokenService
{
    string CreateAccessToken(User user);
    string CreateRefreshToken(User user);
}
