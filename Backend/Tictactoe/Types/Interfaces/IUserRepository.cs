using Tictactoe.Models;

namespace Tictactoe.Types.Interfaces;

public interface IUserRepository
{
    public Task<User?> GetById(string id, CancellationToken cancellationToken = default);
    public Task<User?> GetByEmail(string email, CancellationToken cancellationToken = default);
    public Task<User?> GetByEmailAndPassword(string email, string password, CancellationToken cancellationToken = default);
}