using Tictactoe.Models;
using Tictactoe.Types.Enums;
using Tictactoe.Types.Interfaces;

namespace Tictactoe.DTOs;
public class RoomActivityUpdateResponse: IWithErrorMessage
{
    public Match? Match { get; set; }
    public AppError? Error { get; set; }
}