using MongoDB.Driver;
using Tictactoe.Models;
using Tictactoe.Types.Interfaces;

namespace TictactoeTest.Helper;
public class TestDatabaseCollection(IMongoDatabase database, string prefix): IDatabaseCollection
{
    public IMongoCollection<User> Users  
    { 
        get
        {
            return database.GetCollection<User>($"users_{prefix}");
        }
    }

    public IMongoCollection<Match> Matches 
    { 
        get
        {
            return database.GetCollection<Match>($"matches_{prefix}");
        }
    }
}