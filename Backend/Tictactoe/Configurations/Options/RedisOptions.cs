namespace Tictactoe.Configurations.Options;

public class RedisOptions
{
    public static string OptionSection = "Redis";
    public required string ConnectionString { get; set; }
}