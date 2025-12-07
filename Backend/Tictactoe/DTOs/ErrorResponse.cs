using Tictactoe.Types.Interfaces;

namespace Tictactoe.DTOs;
public class ErrorResponse: IWithErrorMessage
{
    public AppError? Error { get; set; }
}