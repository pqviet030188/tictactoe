using Tictactoe.Models;
using Tictactoe.Types.Enums;

namespace Tictactoe.Types.Interfaces;

public interface IMatchRepository
{
    public Task<Match?> GetById(string userId, string id, CancellationToken cancellationToken = default);
    public Task<IEnumerable<Match>> GetLatestMatches(string? userId, string? lastMatchId, int limit, CancellationToken cancellationToken = default);
    public Task<IEnumerable<Match>> GetOldestMatches(string? userId, string recentOldestMatchId, int limit, CancellationToken cancellationToken = default);
    public Task<Match> UpdatePlayer(string id, string userId, PlayerStatus status, CancellationToken cancellationToken = default);
    public Task<Match> UpdatePlayer(string id, string userId, int playerMove, CancellationToken cancellationToken = default);
    public Task<Match> Create(string userId, string name, string password, CancellationToken cancellationToken = default);
    public Task<Match> UpdateMatch(string id, GameOutcome gameOutcome, CancellationToken cancellationToken = default);
}