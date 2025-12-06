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
        var users = new[]
        {
            new User { CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, Email = "pqviet030188@gmail.com", HashedPassword = "aaa" }
        };
        usersCollection.InsertMany(users);
    }

    public void Down(IMongoDatabase db)
    {
        var usersCollection = db.GetCollection<User>("users");

        // Remove seeded users
        usersCollection.DeleteMany(u =>
            u.Email == "pqviet030188@gmail.com");
    }
}