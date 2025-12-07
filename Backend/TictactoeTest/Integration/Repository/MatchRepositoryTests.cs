using MongoDB.Driver;
using Tictactoe.Types.Interfaces;
using Tictactoe.Repositories;
using MongoDB.Bson;
using FluentAssertions;
using Tictactoe.Models;
using Tictactoe.Types.Enums;
using TictactoeTest.Helper;

namespace TictactoeTest.Integration.Repository;

public class MatchRepositoryTests: IClassFixture<MongoFixture>
{
    private readonly IDatabaseCollection _collection;

    public MatchRepositoryTests(MongoFixture fixture)
    {
        var database = fixture.Database;
        _collection = new TestDatabaseCollection(database, Guid.NewGuid().ToString());

        // Clean collection before each test
        _collection.Matches.DeleteMany(FilterDefinition<Match>.Empty);
    }

    [Fact]
    public async Task CreateMatch()
    {
        var matchRepo = new MatchRepository(_collection);
        var match = await matchRepo.Create(new ObjectId().ToString(), "test", "test");
        var dbMatch = await _collection.Matches.Find(d=>d.Id == match.Id).FirstOrDefaultAsync();
        match.Should().BeEquivalentTo(dbMatch, opts => opts.Excluding(m => m.CreatedAt).Excluding(m => m.UpdatedAt));
    }

    [Fact]
    public async Task GetLatestMatches_ShouldReturnOnlyUserMatchesAfterLastMatchId_WithLessThan10Records()
    {
        var userId = ObjectId.GenerateNewId().ToString();
        var otherUserId = ObjectId.GenerateNewId().ToString();
        var matches = new[]
        {
            new Match { Id = ObjectId.GenerateNewId().ToString(), CreatorId = userId, CreatedAt = DateTime.UtcNow.AddMinutes(-5) },
            new Match { Id = ObjectId.GenerateNewId().ToString(), MemberId = userId, CreatedAt = DateTime.UtcNow.AddMinutes(-3) },
            new Match { Id = ObjectId.GenerateNewId().ToString(), MemberId = userId, CreatedAt = DateTime.UtcNow.AddMinutes(-2) },
            new Match { Id = ObjectId.GenerateNewId().ToString(), CreatorId = otherUserId, CreatedAt = DateTime.UtcNow.AddMinutes(-1) }
        };
        await _collection.Matches.InsertManyAsync(matches);

        var matchRepo = new MatchRepository(_collection);
        var lastMatchId = matches[0].Id;

        var latestMatches = (await matchRepo.GetLatestMatches(userId, lastMatchId!, 10, CancellationToken.None)).ToList();

        latestMatches.Should().HaveCount(2);
        latestMatches[0].Should().BeEquivalentTo(matches[2], options => options
            .Excluding(m => m.CreatedAt)
            .Excluding(m => m.UpdatedAt)
        );
        latestMatches[1].Should().BeEquivalentTo(matches[1], options => options
            .Excluding(m => m.CreatedAt)
            .Excluding(m => m.UpdatedAt)
        );
    }

    [Fact]
    public async Task GetOlderMatches_ShouldReturnEmptyResultsForEmptyInputs()
    {
        var userId = ObjectId.GenerateNewId().ToString();
        var otherUserId = ObjectId.GenerateNewId().ToString();
        var matches = new[]
        {
            new Match { Id = ObjectId.GenerateNewId().ToString(), CreatorId = userId, CreatedAt = DateTime.UtcNow.AddMinutes(-5) },
            new Match { Id = ObjectId.GenerateNewId().ToString(), MemberId = userId, CreatedAt = DateTime.UtcNow.AddMinutes(-3) },
            new Match { Id = ObjectId.GenerateNewId().ToString(), MemberId = userId, CreatedAt = DateTime.UtcNow.AddMinutes(-2) },
            new Match { Id = ObjectId.GenerateNewId().ToString(), CreatorId = otherUserId, CreatedAt = DateTime.UtcNow.AddMinutes(-1) }
        };
        await _collection.Matches.InsertManyAsync(matches);

        var matchRepo = new MatchRepository(_collection);
        var latestMatches = (await matchRepo.GetOlderMatches(null, null!, 10, CancellationToken.None)).ToList();

        latestMatches.Should().HaveCount(0);
    }

    [Fact]
    public async Task GetOlderMatches_ShouldReturnOnlyUserMatchesBeforeMatchId_WithLessThan10Records()
    {
        var userId = ObjectId.GenerateNewId().ToString();
        var otherUserId = ObjectId.GenerateNewId().ToString();
        var matches = new[]
        {
            new Match { Id = ObjectId.GenerateNewId().ToString(), CreatorId = userId, CreatedAt = DateTime.UtcNow.AddMinutes(-5) },
            new Match { Id = ObjectId.GenerateNewId().ToString(), MemberId = userId, CreatedAt = DateTime.UtcNow.AddMinutes(-3) },
            new Match { Id = ObjectId.GenerateNewId().ToString(), MemberId = userId, CreatedAt = DateTime.UtcNow.AddMinutes(-2) },
            new Match { Id = ObjectId.GenerateNewId().ToString(), CreatorId = otherUserId, CreatedAt = DateTime.UtcNow.AddMinutes(-1) }
        };
        await _collection.Matches.InsertManyAsync(matches);

        var matchRepo = new MatchRepository(_collection);
        var lastMatchId = matches[2].Id;

        var latestMatches = (await matchRepo.GetOlderMatches(userId, lastMatchId!, 10, CancellationToken.None)).ToList();

        latestMatches.Should().HaveCount(2);
        latestMatches[0].Should().BeEquivalentTo(matches[1], options => options
            .Excluding(m => m.CreatedAt)
            .Excluding(m => m.UpdatedAt)
        );
        latestMatches[1].Should().BeEquivalentTo(matches[0], options => options
            .Excluding(m => m.CreatedAt)
            .Excluding(m => m.UpdatedAt)
        );
    }

    public async Task<IEnumerable<Match>> SetupData(string userId, string otherUserId)
    {
        var records = Enumerable.Range(0, 20).Select((i) =>
        {
            var ran = new Random().NextDouble() > 0.5 ? true : false;
            return new Match() { 
                Id = ObjectId.GenerateNewId().ToString(), 
                CreatorId = ran? userId: otherUserId,
                MemberId = ran ? otherUserId: userId,
                CreatedAt = DateTime.UtcNow.AddMinutes(-20 + i) };
        }).ToArray();

        var matches = records.Concat(new Match[] { 
            new Match() { Id = ObjectId.GenerateNewId().ToString(), CreatorId = otherUserId, CreatedAt = DateTime.UtcNow.AddMinutes(0) } 
        }).ToList();

        await _collection.Matches.InsertManyAsync(matches);
        return matches;
    }
    
    [Fact]
    public async Task GetLatestMatches_ShouldReturnOnlyUserMatchesAfterLastMatchId_WithMoreThan10Records()
    {
        // Setup
        var userId = ObjectId.GenerateNewId().ToString();
        var otherUserId = ObjectId.GenerateNewId().ToString();
        var matches = (await SetupData(userId, otherUserId)).ToList();

        // Act
        var matchRepo = new MatchRepository(_collection);
        var lastMatchId = matches[0].Id;
        var latestMatches = (await matchRepo.GetLatestMatches(userId, lastMatchId!, 10, CancellationToken.None)).ToList();

        // Assert
        latestMatches.Should().HaveCount(10);
        var cmatches = matches.Where(d=>
            (d.CreatorId == userId || d.MemberId == userId)
            && ObjectId.Parse(d.Id) > ObjectId.Parse(lastMatchId))
            .OrderByDescending(d=>d.CreatedAt).Take(10).ToList();

        for(var i = 0; i < cmatches.Count(); i++)
        {
            latestMatches[i].Should().BeEquivalentTo(cmatches[i], options => options
                .Excluding(m => m.CreatedAt)
                .Excluding(m => m.UpdatedAt)
            );
        }
    }

    [Fact]
    public async Task GetOldertMatches_ShouldReturnOnlyUserMatchesBeforeMatchId_WithMoreThan10Records()
    {
        // Setup
        var userId = ObjectId.GenerateNewId().ToString();
        var otherUserId = ObjectId.GenerateNewId().ToString();
        var matches = (await SetupData(userId, otherUserId)).ToList();

        // Act
        var matchRepo = new MatchRepository(_collection);
        var lastMatchId = matches[15].Id;
        var latestMatches = (await matchRepo.GetOlderMatches(userId, lastMatchId!, 10, CancellationToken.None)).ToList();

        // Assert
        latestMatches.Should().HaveCount(10);
        var cmatches = matches.Where(d=>
            (d.CreatorId == userId || d.MemberId == userId)
            && ObjectId.Parse(d.Id) < ObjectId.Parse(lastMatchId))
            .OrderByDescending(d=>d.CreatedAt).Take(10).ToList();

        for(var i = 0; i < cmatches.Count(); i++)
        {
            latestMatches[i].Should().BeEquivalentTo(cmatches[i], options => options
                .Excluding(m => m.CreatedAt)
                .Excluding(m => m.UpdatedAt)
            );
        }
    }

    [Fact]
    public async Task GetLatestMatches_ShouldReturnOnlyUserMatchesAfterLastMatchId_WithAllLatest()
    { 
        // Setup
        var userId = ObjectId.GenerateNewId().ToString();
        var otherUserId = ObjectId.GenerateNewId().ToString();
        var matches = (await SetupData(userId, otherUserId)).ToList();

        // Act
        var matchRepo = new MatchRepository(_collection);
        var lastMatchId = matches[0].Id;
        var latestMatches = (await matchRepo.GetLatestMatches(null, null, 10, CancellationToken.None)).ToList();

        // Assert
        latestMatches.Should().HaveCount(10);
        var cmatches = matches
            .OrderByDescending(d=>d.CreatedAt).Take(10).ToList();

        for (var i = 0; i < cmatches.Count(); i++)
        {
            latestMatches[i].Should().BeEquivalentTo(cmatches[i], options => options
                .Excluding(m => m.CreatedAt)
                .Excluding(m => m.UpdatedAt)
            );
        }
    }

    [Fact]
    public async Task GetLatestMatches_ShouldReturnOnlyUserMatchesAfterLastMatchId_WithLatest()
    { 
        // Setup
        var userId = ObjectId.GenerateNewId().ToString();
        var otherUserId = ObjectId.GenerateNewId().ToString();
        var matches = (await SetupData(userId, otherUserId)).ToList();

        // Act
        var matchRepo = new MatchRepository(_collection);
        var lastMatchId = matches[0].Id;
        var latestMatches = (await matchRepo.GetLatestMatches(null, lastMatchId, 10, CancellationToken.None)).ToList();

        // Assert
        latestMatches.Should().HaveCount(10);
        var cmatches = matches
            .Where(d=>ObjectId.Parse(d.Id) > ObjectId.Parse(lastMatchId))
            .OrderByDescending(d=>d.CreatedAt).Take(10).ToList();

        for (var i = 0; i < cmatches.Count(); i++)
        {
            latestMatches[i].Should().BeEquivalentTo(cmatches[i], options => options
                .Excluding(m => m.CreatedAt)
                .Excluding(m => m.UpdatedAt)
            );
        }
    }

    [Fact]
    public async Task GetOlderMatches_ShouldReturnOnlyUserMatchesBeforeLastMatchId_WithOldest()
    { 
        // Setup
        var userId = ObjectId.GenerateNewId().ToString();
        var otherUserId = ObjectId.GenerateNewId().ToString();
        var matches = (await SetupData(userId, otherUserId)).ToList();

        // Act
        var matchRepo = new MatchRepository(_collection);
        var lastMatchId = matches[15].Id;
        var latestMatches = (await matchRepo.GetOlderMatches(null, lastMatchId!, 10, CancellationToken.None)).ToList();

        // Assert
        latestMatches.Should().HaveCount(10);
        var cmatches = matches
            .Where(d=>ObjectId.Parse(d.Id) < ObjectId.Parse(lastMatchId))
            .OrderByDescending(d=>d.CreatedAt).Take(10).ToList();

        for (var i = 0; i < cmatches.Count(); i++)
        {
            latestMatches[i].Should().BeEquivalentTo(cmatches[i], options => options
                .Excluding(m => m.CreatedAt)
                .Excluding(m => m.UpdatedAt)
            );
        }
    }

    [Fact]
    public async Task GetLatestMatches_ShouldReturnOnlyUserMatchesAfterLastMatchId_WithAllLatestForUser()
    {
        // Setup
        var userId = ObjectId.GenerateNewId().ToString();
        var otherUserId = ObjectId.GenerateNewId().ToString();
        var matches = (await SetupData(userId, otherUserId)).ToList();

        // Act
        var matchRepo = new MatchRepository(_collection);
        var lastMatchId = matches[0].Id;
        var latestMatches = (await matchRepo.GetLatestMatches(userId, null, 10, CancellationToken.None)).ToList();

        // Assert
        latestMatches.Should().HaveCount(10);
        var cmatches = matches.Where(d=>d.CreatorId == userId || d.MemberId == userId)
            .OrderByDescending(d=>d.CreatedAt).Take(10).ToList();
            
        for (var i = 0; i < cmatches.Count(); i++)
        {
            latestMatches[i].Should().BeEquivalentTo(cmatches[i], options => options
                .Excluding(m => m.CreatedAt)
                .Excluding(m => m.UpdatedAt)
            );
        }
    }

    [Fact]
    public async Task UpdatePlayerStatus_ShouldUpdateStatusForCorrectUser()
    {
        // Arrange
        var creatorId = ObjectId.GenerateNewId().ToString();
        var memberId = ObjectId.GenerateNewId().ToString();

        var match = new Match
        {
            Id = ObjectId.GenerateNewId().ToString(),
            CreatorId = creatorId,
            MemberId = memberId,
            CreatorStatus = PlayerStatus.Left,
            MemberStatus = PlayerStatus.Left
        };

        await _collection.Matches.InsertOneAsync(match);

        var matchRepo = new MatchRepository(_collection);

        // Act - update creator status
        var updatedMatchCreator = await matchRepo.UpdatePlayer(match.Id, creatorId, PlayerStatus.Joined);

        // Assert - only creatorStatus should change
        updatedMatchCreator.CreatorStatus.Should().Be(PlayerStatus.Joined);
        updatedMatchCreator.MemberStatus.Should().Be(PlayerStatus.Left);
        updatedMatchCreator.CreatorId.Should().Be(creatorId);
        updatedMatchCreator.MemberId.Should().Be(memberId);

        // Act - update member status
        var updatedMatchMember = await matchRepo.UpdatePlayer(match.Id, memberId, PlayerStatus.Left);

        // Assert - only memberStatus should change
        updatedMatchMember.CreatorStatus.Should().Be(PlayerStatus.Joined);
        updatedMatchMember.MemberStatus.Should().Be(PlayerStatus.Left);
        updatedMatchMember.CreatorId.Should().Be(creatorId);
        updatedMatchMember.MemberId.Should().Be(memberId);
    }

    [Fact]
    public async Task UpdatePlayerStatus_ShouldJoinUser()
    {
        // Arrange
        var creatorId = ObjectId.GenerateNewId().ToString();
        var memberId = ObjectId.GenerateNewId().ToString();

        var match = new Match
        {
            Id = ObjectId.GenerateNewId().ToString(),
            CreatorId = creatorId,
            CreatorStatus = PlayerStatus.Joined,
            MemberStatus = PlayerStatus.Left,
            MemberMoves = 0
        };

        await _collection.Matches.InsertOneAsync(match);

        var matchRepo = new MatchRepository(_collection);

        // Act - update creator status
        var updatedMatchCreator = await matchRepo.UpdatePlayer(match.Id, memberId, PlayerStatus.Joined);

        // Assert - only creatorStatus should change
        updatedMatchCreator.CreatorStatus.Should().Be(PlayerStatus.Joined);
        updatedMatchCreator.MemberStatus.Should().Be(PlayerStatus.Joined);
        updatedMatchCreator.CreatorId.Should().Be(creatorId);
        updatedMatchCreator.MemberId.Should().Be(memberId);
    }

    [Fact]
    public async Task UpdatePlayerStatus_ShouldNotJoinUser()
    {
        // Arrange
        var creatorId = ObjectId.GenerateNewId().ToString();
        var memberId = ObjectId.GenerateNewId().ToString();

        var match = new Match
        {
            Id = ObjectId.GenerateNewId().ToString(),
            CreatorId = creatorId,
            MemberId = ObjectId.GenerateNewId().ToString(),
            CreatorStatus = PlayerStatus.Joined,
            MemberStatus = PlayerStatus.Left
        };

        await _collection.Matches.InsertOneAsync(match);

        var matchRepo = new MatchRepository(_collection);

        // Act - update creator status
        var updatedMatchCreator = await matchRepo.UpdatePlayer(match.Id, memberId, PlayerStatus.Joined);

        // Assert
        updatedMatchCreator.Should().BeNull();
    }

    [Fact]
    public async Task UpdatePlayerStatus_ShouldReturnNull()
    {
        // Arrange
        var creatorId = ObjectId.GenerateNewId().ToString();
        var memberId = ObjectId.GenerateNewId().ToString();

        var match = new Match
        {
            Id = ObjectId.GenerateNewId().ToString(),
            CreatorId = creatorId,
            MemberId = memberId,
            CreatorStatus = PlayerStatus.Left,
            MemberStatus = PlayerStatus.Left
        };

        await _collection.Matches.InsertOneAsync(match);

        var matchRepo = new MatchRepository(_collection);

        // Act - update creator status with invalid user id
        var updatedMatchCreator = await matchRepo.UpdatePlayer(match.Id, ObjectId.GenerateNewId().ToString(), PlayerStatus.Joined);

        // Assert
        updatedMatchCreator.Should().BeNull();
    }

    [Fact]
    public async Task UpdatePlayerMoves_ShouldUpdateStatusForCorrectUser()
    {
        // Arrange
        var creatorId = ObjectId.GenerateNewId().ToString();
        var memberId = ObjectId.GenerateNewId().ToString();

        var match = new Match
        {
            Id = ObjectId.GenerateNewId().ToString(),
            CreatorId = creatorId,
            MemberId = memberId,
            CreatorStatus = PlayerStatus.Left,
            MemberStatus = PlayerStatus.Left,
            GameOutcome = GameOutcome.Going,
            CreatorMoves = 1,
            MemberMoves = 2,
        };

        await _collection.Matches.InsertOneAsync(match);

        var matchRepo = new MatchRepository(_collection);

        // Act - update creator moves
        var updatedMatchCreator = await matchRepo.UpdatePlayer(match.Id, creatorId, 5, GameOutcome.Going);

        // Assert - only creatorMoves should change
        updatedMatchCreator.CreatorMoves.Should().Be(5);
        updatedMatchCreator.MemberMoves.Should().Be(2);
        updatedMatchCreator.NextTurn.Should().Be(GameTurn.Member);
        updatedMatchCreator.GameOutcome.Should().Be(GameOutcome.Going);

        // Act - update member moves
        var updatedMatchMember = await matchRepo.UpdatePlayer(match.Id, memberId, 6, GameOutcome.CreatorWin);

        // Assert - only member moves should change
        updatedMatchMember.CreatorMoves.Should().Be(5);
        updatedMatchMember.MemberMoves.Should().Be(6);
        updatedMatchMember.NextTurn.Should().Be(GameTurn.Creator);
        updatedMatchMember.GameOutcome.Should().Be(GameOutcome.CreatorWin);
    }

    [Fact]
    public async Task UpdatePlayerMoves_ShouldReturnNull()
    {
        // Arrange
        var creatorId = ObjectId.GenerateNewId().ToString();
        var memberId = ObjectId.GenerateNewId().ToString();

        var match = new Match
        {
            Id = ObjectId.GenerateNewId().ToString(),
            CreatorId = creatorId,
            MemberId = memberId,
            CreatorStatus = PlayerStatus.Left,
            MemberStatus = PlayerStatus.Left
        };

        await _collection.Matches.InsertOneAsync(match);

        var matchRepo = new MatchRepository(_collection);

        // Act - update creator moves with invalid user id
        var updatedMatchCreator = await matchRepo.UpdatePlayer(match.Id, ObjectId.GenerateNewId().ToString(), 2, GameOutcome.PlayerWin);

        // Assert
        updatedMatchCreator.Should().BeNull();
    }

    [Fact]
    public async Task UpdateMatchGameOutcome_ShouldUpdateCorrectOutcome()
    {
        // Arrange
        var creatorId = ObjectId.GenerateNewId().ToString();
        var memberId = ObjectId.GenerateNewId().ToString();

        var match = new Match
        {
            Id = ObjectId.GenerateNewId().ToString(),
            CreatorId = creatorId,
            MemberId = memberId,
            CreatorStatus = PlayerStatus.Left,
            MemberStatus = PlayerStatus.Left,
            CreatorMoves = 1,
            MemberMoves = 2,
        };

        await _collection.Matches.InsertOneAsync(match);

        var matchRepo = new MatchRepository(_collection);

        // Act 
        var updatedMatchCreator = await matchRepo.UpdateMatch(match.Id, GameOutcome.Draw);

        // Assert
        updatedMatchCreator.GameOutcome.Should().Be(GameOutcome.Draw);
    }

    [Fact]
    public async Task UpdateMatchGameOutcome_ShouldReturnNull()
    {
        // Arrange
        var creatorId = ObjectId.GenerateNewId().ToString();
        var memberId = ObjectId.GenerateNewId().ToString();

        var match = new Match
        {
            Id = ObjectId.GenerateNewId().ToString(),
            CreatorId = creatorId,
            MemberId = memberId,
            CreatorStatus = PlayerStatus.Left,
            MemberStatus = PlayerStatus.Left,
            CreatorMoves = 1,
            MemberMoves = 2,
        };

        await _collection.Matches.InsertOneAsync(match);

        var matchRepo = new MatchRepository(_collection);

        // Act 
        var updatedMatchCreator = await matchRepo.UpdateMatch(ObjectId.GenerateNewId().ToString(), GameOutcome.Draw);

        // Assert
        updatedMatchCreator.Should().BeNull();
    }
}