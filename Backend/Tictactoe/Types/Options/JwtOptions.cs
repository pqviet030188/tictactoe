namespace Tictactoe.Types.Options;

public class JwtOptions
{
    public const string OptionSection = "Jwt";
    public string Key { get; set; } = string.Empty;
    public string Issuer { get; set; } = "tictactoe";
    public string Audience { get; set; } = "tictactoe";
    public int AccessTokenMinutes { get; set; } = 15;
    public int RefreshTokenDays { get; set; } = 7;
}
