using MongoDB.Driver;
using Tictactoe.Models;
using Tictactoe.Types.Enums;

namespace Tictactoe.Types.Interfaces;

public interface IMatchRepository
{
    Task<IEnumerable<Match>?> GetByConnectionId(string connectionId, CancellationToken cancellationToken = default);
    Task<Match?> GetById(string userId, string id, CancellationToken cancellationToken = default);
    Task<Match?> GetById(string id, CancellationToken cancellationToken = default);
    Task<IEnumerable<Match>> GetLatestMatches(string? userId, string? lastMatchId, int limit, CancellationToken cancellationToken = default);
    Task<IEnumerable<Match>> GetOlderMatches(string? userId, string recentOlderMatchId, int limit, CancellationToken cancellationToken = default);
    Task<Match> UpdatePlayer(string id, string userId, string connectionId, PlayerStatus status, CancellationToken cancellationToken = default);
    Task<Match> UpdatePlayer(string id, string userId, string connectionId, uint playerMove, GameOutcome gameOutcome, CancellationToken cancellationToken = default);
    Task<UpdateResult> LeaveMatches(string connectionId, CancellationToken cancellationToken = default);
    Task<Match> Create(string userId, string name, string? password, CancellationToken cancellationToken = default);
    Task<Match> UpdateMatch(string id, GameOutcome gameOutcome, CancellationToken cancellationToken = default);
}