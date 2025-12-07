using Tictactoe.Types.Enums;
using Tictactoe.Types.Interfaces;

namespace Tictactoe.DTOs;
public class RoomActivityUpdateRequest: IWithRoomMessage
{
    public required string RoomId { get; set; }
    public required RoomActivity RoomActivity { get; set; }
    public ushort? Move { get; set; }
}