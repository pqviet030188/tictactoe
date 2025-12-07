using CSharp.Mongo.Migration.Interfaces;
using MongoDB.Driver;
using Tictactoe.Helpers;
using Tictactoe.Models;
namespace Tictactoe.Migrations.Mongo;

public class M00001_Seed : IMigration
{
    public string Name => "Seed data";
    public string Version => "0.0.1";

    public void Up(IMongoDatabase db)
    {
        var usersCollection = db.GetCollection<User>("users");
        var matchesCollection = db.GetCollection<Match>("matches");
        var (hashedPassword, salt) = PasswordHelper.HashPassword("123");
        var users = new[]
        {
            new User { CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, Email = "pqviet030188@gmail.com", HashedPassword = hashedPassword, Salt = salt },
            new User { CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, Email = "pqviet030188+112233@gmail.com",  HashedPassword = hashedPassword, Salt = salt }
        };

        var matches = new[]
        {
            new Match { 
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, CreatorId = users[0].Id, MemberId = users[1].Id, 
                CreatorMoves = 0,
                CreatorStatus = Types.Enums.PlayerStatus.Left,
                MemberStatus = Types.Enums.PlayerStatus.Left,
                MemberMoves = 0,
                NextTurn = Types.Enums.GameTurn.Creator,
                GameOutcome = Types.Enums.GameOutcome.Going,
                Name="MatchXMZ 1"
             },
        };

        usersCollection.InsertMany(users);
        matchesCollection.InsertMany(matches);
        
        usersCollection.Indexes.CreateOne(
            new CreateIndexModel<User>(
                Builders<User>.IndexKeys.Ascending(u => u.Email),
                new CreateIndexOptions { Unique = true }
            )
        );

        matchesCollection.Indexes.CreateOne(
            new CreateIndexModel<Match>(
                Builders<Match>.IndexKeys.Ascending(m => m.CreatedAt)
            )
        );
    }

    public void Down(IMongoDatabase db)
    {
        var usersCollection = db.GetCollection<User>("users");
        var matchesCollection = db.GetCollection<Match>("matches");

        // Remove seeded users
        usersCollection.DeleteMany(u =>
            u.Email == "pqviet030188@gmail.com");

        // Remove seeded matches
        matchesCollection.DeleteMany(u =>
            u.Name == "MatchXMZ 1");
    }
}