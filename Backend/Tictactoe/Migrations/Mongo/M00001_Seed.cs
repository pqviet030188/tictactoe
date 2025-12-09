using CSharp.Mongo.Migration.Interfaces;
using MongoDB.Driver;
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
       
        usersCollection.Indexes.CreateOne(
            new CreateIndexModel<User>(
                Builders<User>.IndexKeys.Ascending(u => u.Email),
                new CreateIndexOptions { Unique = true }
            )
        );

        matchesCollection.Indexes.CreateOne(
            new CreateIndexModel<Match>(
                Builders<Match>.IndexKeys.Ascending(m => m.CreatorId)
            )
        );

        matchesCollection.Indexes.CreateOne(
            new CreateIndexModel<Match>(
                Builders<Match>.IndexKeys.Ascending(m => m.MemberId)
            )
        );

        matchesCollection.Indexes.CreateOne(
            new CreateIndexModel<Match>(
                Builders<Match>.IndexKeys.Ascending(m => m.CreatorConnectionId)
            )
        );

        matchesCollection.Indexes.CreateOne(
            new CreateIndexModel<Match>(
                Builders<Match>.IndexKeys.Ascending(m => m.MemberConnectionId)
            )
        );
    }

    public void Down(IMongoDatabase db)
    {
    }
}