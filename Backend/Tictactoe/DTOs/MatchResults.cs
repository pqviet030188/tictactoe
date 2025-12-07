using Tictactoe.Models;
using Tictactoe.Types.Interfaces;

namespace Tictactoe.DTOs;

public class MatchResults
{
    public required IEnumerable<Match> Matches { get; set; }
    public required int Count { get; set; }
}

public class MatchResultsWithError : MatchResults, IWithErrorMessage
{
    public AppError? Error { get; set; }
}