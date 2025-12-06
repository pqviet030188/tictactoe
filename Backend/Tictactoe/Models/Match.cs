using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Tictactoe.Types.Enums;

namespace Tictactoe.Models;

public class Match
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("name")]
    [BsonRepresentation(BsonType.String)]
    public string Name { get; set; } = null!;

    [BsonElement("hashedPassword")] 
    [BsonRepresentation(BsonType.String)]
    public string HashedPassword { get; set; } = null!;

    [BsonElement("salt")]
    [BsonRepresentation(BsonType.String)]
    public string Salt { get; set; } = null!;

    [BsonElement("creatorId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string CreatorId { get; set; } = null!;

    [BsonElement("memberId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? MemberId { get; set; } = null!;

    [BsonElement("creatorStatus")]
    public PlayerStatus? CreatorStatus { get; set; } = PlayerStatus.Left;

    [BsonElement("memberStatus")]
    public PlayerStatus? MemberStatus { get; set; } = PlayerStatus.Left;

    [BsonElement("creatorMoves")]
    public ushort CreatorMoves { get; set; } = 0;

    [BsonElement("memberMoves")]
    public ushort MemberMoves { get; set; } = 0;

    [BsonElement("nextTurn")]
    public GameTurn NextTurn { get; set; } = GameTurn.Creator;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("gameOutcome")]
    public GameOutcome GameOutcome { get; set; } = GameOutcome.Going;

    public bool HasFinished
    {
        get
        {
            return GameOutcome != default && GameOutcome != GameOutcome.Going;
        }
    }

    public bool HashMember(string userId)
    {
        return string.Equals(MemberId, userId, StringComparison.Ordinal) || string.Equals(CreatorId, userId, StringComparison.Ordinal);
    }
}