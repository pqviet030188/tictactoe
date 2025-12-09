namespace Tictactoe.Helpers;

public class RoomEncodingHelper 
{
 
    private const string Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"; 
    private const int Base = 62;
    private const int Length = 7;
    private const long Max = 78364164096;
    private const long Multiplier = 7;

    public static long GetOffset(DateTime date)
    {
        // get milliseconds since start of year
        var startOfYear = new DateTime(date.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        return (long)(date.ToUniversalTime() - startOfYear).TotalMilliseconds;
    }

    // Encode offset deterministically into a fixed-length string
    public static string EncodeOffset(long offset)
    {
        // offset values are different, permuted values are different too
        long permuted = (offset * Multiplier) % Max;

        var chars = new char[Length];

        // convert to base 62
        for (int i = Length - 1; i >= 0; i--)
        {
            chars[i] = Alphabet[(int)(permuted % Base)];
            permuted /= Base;
        }

        return new string(chars);
    }

    // Generate the ID
    public static string GenerateId()
    {
        long offset = GetOffset(DateTime.UtcNow);
        return EncodeOffset(offset);
    }
}