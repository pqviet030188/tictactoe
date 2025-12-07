using Tictactoe.Models;

namespace Tictactoe.Types.Interfaces;

public interface IUserRepository
{
    Task<User?> GetById(string id, CancellationToken cancellationToken = default);
    Task<User?> GetByEmail(string email, CancellationToken cancellationToken = default);
    Task<User?> GetByEmailAndPassword(string email, string password, CancellationToken cancellationToken = default);
    Task<User> Create(string email, string password, CancellationToken cancellationToken = default);
}