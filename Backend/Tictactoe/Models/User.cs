namespace Tictactoe.Models;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Tictactoe.Helpers;

public class User
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    [BsonElement("email")]
    public string Email { get; set; } = null!;

    [BsonElement("hashedPassword")]
    public string HashedPassword { get; set; } = null!;

    [BsonElement("salt")]
    public string Salt { get; set; } = null!;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public bool VerifyPassword(string password)
    {
        return PasswordHelper.VerifyPassword(password, HashedPassword, Salt);
    }
}