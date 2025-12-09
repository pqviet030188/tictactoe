namespace Tictactoe.DTOs;
public class CreateRoomRequest
{
    [Obsolete("Name is deprecated and will be ignored. Room names are now generated automatically.")]
    public required string Name { get; set; }
    public string? Password { get; set; }
}