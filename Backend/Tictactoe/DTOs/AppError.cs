
namespace Tictactoe.DTOs;

public class AppError
{
    public required string ErrorMessage { get; set; }
    public string? ErrorDetailMessage { get; set;}
    public required string ErrorCode { get; set; }
}

public static class RoomErrorCatalog
{
    public static AppError MatchNotFound(string matchId) => new AppError()
    {
        ErrorCode = "MATCH_NOT_FOUND",
        ErrorMessage = $"The match {matchId} cannot be found.",
        ErrorDetailMessage = $"The match {matchId} cannot be found due to reasons."
    };

    public static AppError InvalidMatchOperation(string message) => new AppError()
    {
        ErrorCode = "INVALID_MATCH_OPERATION",
        ErrorMessage = "The operation is invalid",
        ErrorDetailMessage = message
    };

    public static AppError AuthorisationFailed(string matchId) => new AppError()
    {
        ErrorCode = "AUTH_FAILED",
        ErrorMessage = "You are not authorised to operate this operation.",
        ErrorDetailMessage = $"You are not authorised to operate on the match {matchId}."
    };

    public static AppError AuthenticationFailed(string detailedMessage) => new AppError()
    {
        ErrorCode = "AUTH_FAILED",
        ErrorMessage = "You are not authenticated to operate this operation.",
        ErrorDetailMessage = detailedMessage
    };
}