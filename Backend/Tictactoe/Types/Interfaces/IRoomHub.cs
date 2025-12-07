using Tictactoe.DTOs;

namespace Tictactoe.Types.Interfaces;

public interface IRoomHub
{
    Task<RoomActivityUpdateResponse> UpdateRoomActivity(RoomActivityUpdateRequest request);
}