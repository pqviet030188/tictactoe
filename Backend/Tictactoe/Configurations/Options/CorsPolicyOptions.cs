namespace Tictactoe.Configurations.Options;

public class CorsPolicies
{
    public required string Name { get; set; }
    public string[] AllowedOrigins { get; set; } = [];
    public bool AllowAnyHeader { get; set; } = false;
    public bool AllowAnyMethod { get; set; } = false;
    public bool AllowCredentials { get; set; } = true;
}

public class CorsPolicyOptions
{
    public static string OptionSection = "CorsPolicies";
    // Policy name to use
    public required string Use { get; set; }
    public required CorsPolicies[] Policies { get; set; }
}