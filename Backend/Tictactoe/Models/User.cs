namespace Tictactoe.Models;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Text.Json.Serialization;
using Tictactoe.Helpers;

public class User
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    [BsonElement("email")]
    public string Email { get; set; } = null!;

    [BsonElement("hashedPassword")]
    [JsonIgnore]
    public string HashedPassword { get; set; } = null!;

    [BsonElement("salt")]
    [JsonIgnore]
    public string Salt { get; set; } = null!;

    [BsonElement("createdAt")]
    [JsonIgnore]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    [JsonIgnore]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public bool VerifyPassword(string password)
    {
        return PasswordHelper.VerifyPassword(password, HashedPassword, Salt);
    }
}