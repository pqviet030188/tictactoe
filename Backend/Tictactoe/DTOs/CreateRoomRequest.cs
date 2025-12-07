namespace Tictactoe.DTOs;
public class CreateRoomRequest
{
    public required string Name { get; set; }
    public string? Password { get; set; }
}