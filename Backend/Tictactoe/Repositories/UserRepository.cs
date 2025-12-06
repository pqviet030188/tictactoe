using MongoDB.Driver;
using Tictactoe.Helpers;
using Tictactoe.Models;
using Tictactoe.Types.Interfaces;

namespace Tictactoe.Repositories;
public class UserRepository(IDatabaseCollection databaseCollection): IUserRepository
{
    public async Task<User?> GetById(string id, CancellationToken cancellationToken = default) =>
        await databaseCollection.Users.Find(u => u.Id == id).FirstOrDefaultAsync(cancellationToken);

    public async Task<User?> GetByEmail(string email, CancellationToken cancellationToken = default) =>
        await databaseCollection.Users.Find(u => u.Email == email).FirstOrDefaultAsync(cancellationToken);

    public async Task<User?> GetByEmailAndPassword(string email, string password, CancellationToken cancellationToken = default)
    {
        var user = await GetByEmail(email, cancellationToken);
        if (user == null)
            return null;

        return PasswordHelper.VerifyPassword(password, user.HashedPassword, user.Salt) ? user : null;
    }

    public async Task<User?> Create(string email, string password, CancellationToken cancellationToken = default)
    {
        var (hash, salt) = PasswordHelper.HashPassword(password);
        var user = new User
        {
            Email = email,
            HashedPassword = hash,
            Salt = salt,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        await databaseCollection.Users.InsertOneAsync(user, null, cancellationToken);
        return user;
    }
}