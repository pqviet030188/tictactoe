namespace Tictactoe.Configurations.Options;

public class MongoDbOptions
{
    public static string OptionSection = "MongoDb";
    public required string ConnectionString { get; set; }
}