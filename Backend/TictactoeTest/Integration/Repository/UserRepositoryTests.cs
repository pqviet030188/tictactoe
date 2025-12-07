using MongoDB.Driver;
using Tictactoe.Types.Interfaces;
using Tictactoe.Repositories;
using MongoDB.Bson;
using FluentAssertions;
using Tictactoe.Models;
using Tictactoe.Helpers;
using TictactoeTest.Helper;

namespace TictactoeTest.Integration.Repository;

public class UserRepositoryTests: IClassFixture<MongoFixture>
{
    private readonly IDatabaseCollection _collection;

    public UserRepositoryTests(MongoFixture fixture)
    {
        var database = fixture.Database;
        _collection = new TestDatabaseCollection(database, Guid.NewGuid().ToString());

        // Clean collection before each test
        _collection.Users.DeleteMany(FilterDefinition<User>.Empty);
    }

    [Fact]
    public async Task CreateUser()
    {
        var userRepo = new UserRepository(_collection);
        var user = await userRepo.Create(new ObjectId().ToString(), "test");

        var dbMatch = await _collection.Users.Find(d=>d.Id == user!.Id).FirstOrDefaultAsync();

        user.Should().BeEquivalentTo(dbMatch, opts => opts.Excluding(m => m.CreatedAt).Excluding(m => m.UpdatedAt));
        user.VerifyPassword("test");
    }

    [Fact]
    public async Task GetById()
    {
        var userRepo = new UserRepository(_collection);
        var users = new[]
        {
            new User { Id = ObjectId.GenerateNewId().ToString(), Email = "random", CreatedAt = DateTime.UtcNow.AddMinutes(-5) }
        };
        await _collection.Users.InsertManyAsync(users);
        var userId = users[0].Id;

        // Act
        var foundUser = await userRepo.GetById(userId, CancellationToken.None);

        var dbUser = await _collection.Users.Find(d=>d.Id == userId).FirstOrDefaultAsync();
        foundUser.Should().BeEquivalentTo(dbUser, opts => opts.Excluding(m => m.CreatedAt).Excluding(m => m.UpdatedAt));

        // Act
        foundUser = await userRepo.GetById(ObjectId.GenerateNewId().ToString(), CancellationToken.None);
        foundUser.Should().BeNull();
    }

    [Fact]
    public async Task GetByEmail()
    {
        var userRepo = new UserRepository(_collection);
        var userEmail= "random";
        var users = new[]
        {
            new User { Id = ObjectId.GenerateNewId().ToString(), Email = userEmail, CreatedAt = DateTime.UtcNow.AddMinutes(-5) }
        };
        await _collection.Users.InsertManyAsync(users);

        // Act
        var foundUser = await userRepo.GetByEmail(userEmail, CancellationToken.None);

        var dbUser = await _collection.Users.Find(d=>d.Email == userEmail).FirstOrDefaultAsync();
        foundUser.Should().BeEquivalentTo(dbUser, opts => opts.Excluding(m => m.CreatedAt).Excluding(m => m.UpdatedAt));

        // Act
        foundUser = await userRepo.GetByEmail("other", CancellationToken.None);
        foundUser.Should().BeNull();
    }

    [Fact]
    public async Task GetByEmailAndPassword()
    {
        var userRepo = new UserRepository(_collection);
        var userEmail= "random";
        var (hash, salt) = PasswordHelper.HashPassword("test");
        var users = new[]
        {
            new User { Id = ObjectId.GenerateNewId().ToString(), Email = userEmail, HashedPassword = hash, Salt = salt, CreatedAt = DateTime.UtcNow.AddMinutes(-5) }
        };
        await _collection.Users.InsertManyAsync(users);

        // Act
        var foundUser = await userRepo.GetByEmailAndPassword(userEmail, "test", CancellationToken.None);

        var dbUser = await _collection.Users.Find(d=>d.Email == userEmail).FirstOrDefaultAsync();
        foundUser.Should().BeEquivalentTo(dbUser, opts => opts.Excluding(m => m.CreatedAt).Excluding(m => m.UpdatedAt));

        // Act
        foundUser = await userRepo.GetByEmailAndPassword(userEmail, "wrongpass", CancellationToken.None);
        foundUser.Should().BeNull();

        // Act
        foundUser = await userRepo.GetByEmailAndPassword("wrongemail", "wrongpass", CancellationToken.None);
        foundUser.Should().BeNull();
    }
}