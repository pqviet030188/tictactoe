using MongoDB.Driver;
using Tictactoe.Models;
using Tictactoe.Types.Interfaces;

namespace Tictactoe.Repositories;

public class DatabaseCollection(IMongoDatabase database): IDatabaseCollection
{
    public IMongoCollection<User> Users  
    { 
        get
        {
            return database.GetCollection<User>("users");
        }
    }

    public IMongoCollection<Match> Matches 
    { 
        get
        {
            return database.GetCollection<Match>("matches");
        }
    }
}