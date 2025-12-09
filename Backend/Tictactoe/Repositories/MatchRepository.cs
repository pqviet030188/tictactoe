using MongoDB.Bson;
using MongoDB.Driver;
using Tictactoe.Helpers;
using Tictactoe.Models;
using Tictactoe.Types.Enums;
using Tictactoe.Types.Interfaces;

namespace Tictactoe.Repositories;

public class MatchRepository(IDatabaseCollection databaseCollection) : IMatchRepository
{
    public async Task<Match?> GetById(string userId, string id, CancellationToken cancellationToken = default)
    {
        var match = await databaseCollection.Matches.Find(u => u.Id == id).FirstOrDefaultAsync(cancellationToken);
        return (match?.HashMember(userId) ?? false) ? match : null;
    }

    public async Task<IEnumerable<Match>?> GetByConnectionId(string connectionId, CancellationToken cancellationToken = default)
    {
        var matches = await databaseCollection.Matches.Find(
            u => u.CreatorConnectionId == connectionId 
            || u.MemberConnectionId == connectionId).ToListAsync(cancellationToken);

        return matches;
    }

    public async Task<IEnumerable<Match>> GetLatestMatches(string? userId, string? lastMatchId, int limit, CancellationToken cancellationToken = default)
    {
        var filter = Builders<Match>.Filter;

        var openMatchesFilter = string.IsNullOrEmpty(userId) ?
            filter.Eq(d => d.MemberId, null) :
            filter.Or(
                filter.Eq(d => d.MemberId, null),
                filter.Or(
                    filter.And(
                        filter.Eq(d => d.CreatorId, userId),
                        filter.Eq(d => d.GameOutcome, GameOutcome.Going)
                    ),
                    filter.And(
                        filter.Eq(d => d.MemberId, userId),
                        filter.Eq(d => d.GameOutcome, GameOutcome.Going)
                    )
                )
            );

        if (!string.IsNullOrWhiteSpace(lastMatchId))
        {
            // Query top latest ones of the user from last match
            openMatchesFilter = filter.And(
                openMatchesFilter,
                filter.Gt(d => d.Id, lastMatchId)
            );
        }

        return await databaseCollection.Matches.Find(openMatchesFilter)
            .SortByDescending(d => d.CreatedAt).Limit(limit).ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<Match>> GetOlderMatches(string? userId, string recentOlderMatchId, int limit, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(recentOlderMatchId))
            return Enumerable.Empty<Match>();

        var filter = Builders<Match>.Filter;
        var openMatchesFilter = string.IsNullOrEmpty(userId) ?
            filter.Eq(d => d.MemberId, null) :
            filter.Or(
                filter.Eq(d => d.MemberId, null),
                filter.Or(
                    filter.And(
                        filter.Eq(d => d.CreatorId, userId),
                        filter.Eq(d => d.GameOutcome, GameOutcome.Going)
                    ),
                    filter.And(
                        filter.Eq(d => d.MemberId, userId),
                        filter.Eq(d => d.GameOutcome, GameOutcome.Going)
                    )
                )
            );

        openMatchesFilter = filter.And(
                openMatchesFilter,
                filter.Lt(d => d.Id, recentOlderMatchId)
            );

        return await databaseCollection.Matches.Find(openMatchesFilter)
            .SortByDescending(d => d.CreatedAt).Limit(limit).ToListAsync(cancellationToken);
    }

    public async Task<Match> UpdatePlayer(string id, string userId, string connectionId, PlayerStatus status, CancellationToken cancellationToken = default)
    {
        var mfilter = Builders<Match>.Filter;
        var filter = mfilter.And(
            mfilter.Eq(m => m.Id, id),

            // Allow only if the user is creator or member, or if joining as member and there is no member yet
            mfilter.Or(
                mfilter.Eq(m => m.CreatorId, userId),
                mfilter.Eq(m => m.MemberId, userId),
                mfilter.And(

                    // Allow joining as member if there is no member yet
                    mfilter.Eq(m => m.MemberMoves, 0),
                    mfilter.Eq(m => m.MemberStatus, PlayerStatus.Left),
                    mfilter.Eq(m => m.MemberId, null)
                )
            ),

            // If leaving, allow always. If joining, only allow if match is ongoing
            status == PlayerStatus.Left ? mfilter.Or(
                mfilter.Eq(m => m.CreatorId, userId),
                mfilter.Eq(m => m.MemberId, userId)
            ) : mfilter.Eq(m => m.GameOutcome, GameOutcome.Going),

            // If leaving, allow if the connection ID matches
            status == PlayerStatus.Left ? mfilter.Or(
                mfilter.Eq(m => m.CreatorConnectionId, connectionId),
                mfilter.Eq(m => m.MemberConnectionId, connectionId)
            ) :
            // If joining, allow if the player has left
            mfilter.Or(
                mfilter.And(
                    mfilter.Eq(m => m.CreatorId, userId),
                    mfilter.Eq(m => m.CreatorStatus, PlayerStatus.Left)
                ),
                mfilter.And(
                    mfilter.Eq(m => m.MemberId, userId),
                    mfilter.Eq(m => m.MemberStatus, PlayerStatus.Left)
                ),
                mfilter.Eq(m => m.MemberId, null)
            )
        );

        var pipeline = new[]
        {
            new BsonDocument("$set", new BsonDocument
            {
                  { "creatorConnectionId", new BsonDocument("$cond", new BsonArray
                      {
                          new BsonDocument("$eq", new BsonArray { "$creatorId", new ObjectId(userId) }),
                          connectionId,
                          "$creatorConnectionId",
                      })
                  },
                   { "memberConnectionId", new BsonDocument("$cond", new BsonArray
                      {
                          new BsonDocument("$eq", new BsonArray { "$creatorId", new ObjectId(userId) }),
                          "$memberConnectionId",
                          connectionId,
                      })
                  },
                  { "creatorStatus", new BsonDocument("$cond", new BsonArray
                      {
                          new BsonDocument("$eq", new BsonArray { "$creatorId", new ObjectId(userId) }),
                          status,
                          "$creatorStatus",
                      })
                  },
                  { "memberStatus", new BsonDocument("$cond", new BsonArray
                      {
                          new BsonDocument("$eq", new BsonArray { "$creatorId", new ObjectId(userId) }),
                          "$memberStatus",
                          status,
                      })
                  },
                  { "memberId", new BsonDocument("$cond", new BsonArray
                      {
                          new BsonDocument("$eq", new BsonArray { "$creatorId", new ObjectId(userId) }),
                          "$memberId",
                          new ObjectId(userId),
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

    public async Task<Match> UpdatePlayer(string id, string userId, string connectionId, uint playerMove, GameOutcome gameOutcome, CancellationToken cancellationToken = default)
    {
        var mfilter = Builders<Match>.Filter;
        var filter = mfilter.And(
            mfilter.Eq(m => m.Id, id),

            // Ensure the game is going
            mfilter.Eq(m => m.GameOutcome, GameOutcome.Going),

            // Ensure both players are set
            mfilter.Not(mfilter.Eq(m => m.MemberId, null)),
            mfilter.Not(mfilter.Eq(m => m.CreatorId, null)),

            // Ensure it's the user's connection ID
            mfilter.Or(
                mfilter.Eq(m => m.CreatorConnectionId, connectionId),
                mfilter.Eq(m => m.MemberConnectionId, connectionId)
            ),

            // Ensure it's the user's turn
            mfilter.Or(
                mfilter.And(
                    mfilter.Eq(m => m.CreatorId, userId),
                    mfilter.Eq(m => m.NextTurn, GameTurn.Creator)
                ),
                mfilter.And(
                    mfilter.Eq(m => m.MemberId, userId),
                    mfilter.Eq(m => m.NextTurn, GameTurn.Member)
                )
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

    public async Task<UpdateResult> LeaveMatches(string connectionId, CancellationToken cancellationToken = default)
    {
        var filter = Builders<Match>.Filter;
        var leaveFilter = filter.Or(
            filter.Eq(m => m.MemberConnectionId, connectionId),
            filter.Eq(m => m.CreatorConnectionId, connectionId)
        );

        var pipeline = new[]
        {
            new BsonDocument("$set", new BsonDocument
            {
                { "creatorStatus", new BsonDocument("$cond", new BsonArray
                    {
                        new BsonDocument("$eq", new BsonArray { "$memberConnectionId", connectionId }),
                        "$creatorStatus",
                        PlayerStatus.Left,
                    })
                },
                { "memberStatus", new BsonDocument("$cond", new BsonArray
                    {
                        new BsonDocument("$eq", new BsonArray { "$memberConnectionId", connectionId }),
                        PlayerStatus.Left,
                        "$memberStatus",
                    })
                },
                { "updatedAt", DateTime.UtcNow }
            })
        };

        var pipelineDef = PipelineDefinition<Match, Match>.Create(pipeline);

        var updatedMatches = await databaseCollection.Matches.UpdateManyAsync(
            leaveFilter,
            Builders<Match>.Update.Pipeline(pipelineDef),
            new UpdateOptions
            {
                IsUpsert = false,
            },
            cancellationToken
        );

        return updatedMatches;
    }

    public async Task<Match> Create(string userId, string name, string? password, CancellationToken cancellationToken = default)
    {
        var (hash, salt) = string.IsNullOrEmpty(password) ? (null, null) : PasswordHelper.HashPassword(password);
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
            NextTurn = new Random().NextDouble() > 0.5 ? GameTurn.Creator : GameTurn.Member,
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

    public async Task<Match?> GetById(string id, CancellationToken cancellationToken = default)
    {
        return await databaseCollection.Matches.Find(m => m.Id == id).FirstOrDefaultAsync(cancellationToken);
    }
}