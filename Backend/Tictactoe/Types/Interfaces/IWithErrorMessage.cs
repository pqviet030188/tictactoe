using Tictactoe.DTOs;

namespace Tictactoe.Types.Interfaces;

public interface IWithErrorMessage
{
    AppError? Error { get; set; }
}