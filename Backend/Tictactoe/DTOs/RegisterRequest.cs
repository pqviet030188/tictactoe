namespace Tictactoe.DTOs;

public class RegisterRequest
{
    public required string Email { get; set; }
    public required string Password { get; set; }
    public required string ConfirmPassword { get; set; }
}