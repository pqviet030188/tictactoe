namespace Tictactoe.Configurations.Options;

public class HttpsOptions
{
    public static string OptionSection = "Https";
    public required bool Enabled { get; set; }
    public required bool RedirectToHttps { get; set; }
    public required bool RequireHttpsMetadata { get; set; }

    public static HttpsOptions Default()
    {
        return new HttpsOptions
            {
                Enabled = false,
                RedirectToHttps = false,
                RequireHttpsMetadata = false
            };
    }

    public bool CRequireHttpsMetadata
    {
        get { return RequireHttpsMetadata && Enabled; }
    }
}