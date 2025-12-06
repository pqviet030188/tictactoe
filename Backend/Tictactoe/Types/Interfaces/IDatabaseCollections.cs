using MongoDB.Driver;
using Tictactoe.Models;

namespace Tictactoe.Types.Interfaces;

public interface IDatabaseCollection
{
    public IMongoCollection<User> Users { get; }
    public IMongoCollection<Match> Matches { get; }
}