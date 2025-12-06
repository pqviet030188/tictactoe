using MongoDB.Bson;
using MongoDB.Driver;
using Tictactoe.Helpers;
using Tictactoe.Models;
using Tictactoe.Types.Enums;
using Tictactoe.Types.Interfaces;

namespace Tictactoe.Repositories;
public class MatchRepository(IDatabaseCollection databaseCollection): IMatchRepository
{
    public async Task<Match?> GetById(string userId, string id, CancellationToken cancellationToken = default)
    {
        var match = await databaseCollection.Matches.Find(u => u.Id == id).FirstOrDefaultAsync(cancellationToken);
        return (match?.HashMember(userId) ?? false) ? match : null;
    }

    public async Task<IEnumerable<Match>> GetLatestMatches(string? userId, string? lastMatchId, int limit, CancellationToken cancellationToken = default)
    {
        var filter = Builders<Match>.Filter;
        FilterDefinition<Match> ffilter = null!;

        if (string.IsNullOrWhiteSpace(userId) && string.IsNullOrWhiteSpace(lastMatchId))
        {
            // Query top latest ones     
            ffilter = filter.Empty;
        } 
        else if (!string.IsNullOrWhiteSpace(userId) && string.IsNullOrWhiteSpace(lastMatchId))
        {
            // Query top latest ones of the user
            ffilter = filter.And(
                filter.Or(
                    filter.Eq(d=>d.CreatorId, userId),
                    filter.Eq(d=>d.MemberId, userId)
                )
            );       
        }
        else if (!string.IsNullOrWhiteSpace(userId) && !string.IsNullOrWhiteSpace(lastMatchId))
        {
            // Query top latest ones of the user from last match
            ffilter = filter.And(
                filter.Or(
                    filter.Eq(d=>d.CreatorId, userId),
                    filter.Eq(d=>d.MemberId, userId)
                ),
                filter.Gt(d=>d.Id, lastMatchId)
            );  
        }
        else if (!string.IsNullOrWhiteSpace(lastMatchId) && string.IsNullOrWhiteSpace(userId))
        {
            // Query top latest
            ffilter = filter.Gt(d=>d.Id, lastMatchId);
        }

        return await databaseCollection.Matches.Find(ffilter!)
            .SortByDescending(d=>d.CreatedAt).Limit(limit).ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<Match>> GetOldestMatches(string? userId, string recentOldestMatchId, int limit, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(recentOldestMatchId))
            return Enumerable.Empty<Match>();
        
        var filter = Builders<Match>.Filter;
        FilterDefinition<Match> ffilter = null!;

        if (!string.IsNullOrWhiteSpace(userId))
        {
            
            ffilter = filter.And(
                filter.Or(
                    filter.Eq(d=>d.CreatorId, userId),
                    filter.Eq(d=>d.MemberId, userId)
                ),
                filter.Lt(d=>d.Id, recentOldestMatchId)
            );            
        }
        else
        {
             ffilter = filter.Lt(d=>d.Id, recentOldestMatchId);
        }

        return await databaseCollection.Matches.Find(ffilter!)
            .SortByDescending(d=>d.CreatedAt).Limit(limit).ToListAsync(cancellationToken);
    }

    public async Task<Match> UpdatePlayer(string id, string userId, PlayerStatus status, CancellationToken cancellationToken = default)
    {
        var filter = Builders<Match>.Filter.And(
            Builders<Match>.Filter.Eq(m => m.Id, id),
            Builders<Match>.Filter.Or(
                Builders<Match>.Filter.Eq(m => m.CreatorId, userId),
                Builders<Match>.Filter.Eq(m => m.MemberId, userId)
            )
        );

        var pipeline = new[]
        {
            new BsonDocument("$set", new BsonDocument
            {
                  { "creatorStatus", new BsonDocument("$cond", new BsonArray
                      {
                          new BsonDocument("$eq", new BsonArray { "$creatorId", new ObjectId(userId) }),
                          status,
                          "$creatorStatus",
                      })
                  },
                  { "memberStatus", new BsonDocument("$cond", new BsonArray
                      {
                          new BsonDocument("$eq", new BsonArray { "$memberId", new ObjectId(userId) }),
                          status,
                          "$memberStatus"
                      })
                  },
                { "updatedAt", DateTime.UtcNow }
            })
        };

        var pipelineDef = PipelineDefinition<Match, Match>.Create(pipeline);
        var updatedMatch = await databaseCollection.Matches.FindOneAndUpdateAsync(
            filter,
            Builders<Match>.Update.Pipeline(pipelineDef),
            new FindOneAndUpdateOptions<Match>
            {
                ReturnDocument = ReturnDocument.After
            },
            cancellationToken
        );

        return updatedMatch;
    }

    public async Task<Match> UpdatePlayer(string id, string userId, int playerMove, CancellationToken cancellationToken = default)
    {
        var filter = Builders<Match>.Filter.And(
            Builders<Match>.Filter.Eq(m => m.Id, id),
            Builders<Match>.Filter.Or(
                Builders<Match>.Filter.Eq(m => m.CreatorId, userId),
                Builders<Match>.Filter.Eq(m => m.MemberId, userId)
            )
        );

        var pipeline = new[]
        {
            new BsonDocument("$set", new BsonDocument
            {
                { "creatorMoves", new BsonDocument("$cond", new BsonArray
                    {
                        new BsonDocument("$eq", new BsonArray { "$creatorId", new ObjectId(userId) }),
                        playerMove,
                        "$creatorMoves",
                    })
                },
                { "memberMoves", new BsonDocument("$cond", new BsonArray
                    {
                        new BsonDocument("$eq", new BsonArray { "$memberId", new ObjectId(userId) }),
                        playerMove,
                        "$memberMoves"
                    })
                },
                { "nextTurn", new BsonDocument("$cond", new BsonArray
                    {
                        new BsonDocument("$eq", new BsonArray { "$creatorId", new ObjectId(userId) }),
                        GameTurn.Member,
                        GameTurn.Creator
                    })
                },
                { "updatedAt", DateTime.UtcNow }
            })
        };

        var pipelineDef = PipelineDefinition<Match, Match>.Create(pipeline);

        var updatedMatch = await databaseCollection.Matches.FindOneAndUpdateAsync(
            filter,
            Builders<Match>.Update.Pipeline(pipelineDef),
            new FindOneAndUpdateOptions<Match>
            {
                ReturnDocument = ReturnDocument.After
            },
            cancellationToken
        );

        return updatedMatch;
    }

    public async Task<Match> Create(string userId, string name, string password, CancellationToken cancellationToken = default)
    {
        var (hash, salt) = PasswordHelper.HashPassword(password);
        var match = new Match
        {
            Name = name,
            HashedPassword = hash,
            Salt = salt,
            CreatorId = userId,
            MemberId = null,
            CreatorStatus = PlayerStatus.Left,
            MemberStatus = PlayerStatus.Left,
            CreatorMoves = 0,
            MemberMoves = 0,
            NextTurn = new Random().NextDouble() > 0.5? GameTurn.Creator: GameTurn.Member,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            GameOutcome = GameOutcome.Going,
        };

        await databaseCollection.Matches.InsertOneAsync(match, null, cancellationToken);
        return match;
    }

    public async Task<Match> UpdateMatch(string id, GameOutcome gameOutcome, CancellationToken cancellationToken = default)
    {
        var filter = Builders<Match>.Filter.Eq(m => m.Id, id);

        var pipeline = new[]
        {
            new BsonDocument("$set", new BsonDocument
            {
                { 
                    "gameOutcome", gameOutcome
                },
                { "updatedAt", DateTime.UtcNow }
            })
        };

        var pipelineDef = PipelineDefinition<Match, Match>.Create(pipeline);

        var updatedMatch = await databaseCollection.Matches.FindOneAndUpdateAsync(
            filter,
            Builders<Match>.Update.Pipeline(pipelineDef),
            new FindOneAndUpdateOptions<Match>
            {
                ReturnDocument = ReturnDocument.After
            },
            cancellationToken
        );

        return updatedMatch;
    }
}