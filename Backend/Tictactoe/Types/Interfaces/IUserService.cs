using Tictactoe.DTOs;
using Tictactoe.Models;

namespace Tictactoe.Types.Interfaces;

public interface IUserService
{
    Task<User> CreateUser(RegisterRequest request, CancellationToken cancellationToken = default);
    Task<User?> GetUserById(string userId, CancellationToken cancellationToken = default);
    Task<AuthResponse> Login(string email, string password, CancellationToken cancellationToken = default);
    Task<AuthResponse> Refresh(string refreshToken, CancellationToken cancellationToken = default);
    Task Logout(CancellationToken cancellationToken = default);
}