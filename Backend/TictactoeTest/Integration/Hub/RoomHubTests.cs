using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Tictactoe;
using Tictactoe.DTOs;
using Tictactoe.Models;
using Tictactoe.Services;
using Tictactoe.Types.Enums;
using Microsoft.Extensions.Configuration;
using Tictactoe.Hubs;
using MongoDB.Bson;
using Tictactoe.Configurations.Options;
using TictactoeTest.Helper;
using Tictactoe.Types.Interfaces;
using MongoDB.Driver;

namespace TictactoeTest.Integration.Hub;

public class CookieMessageHandler : DelegatingHandler
{
    private readonly string _cookieValue;

    public CookieMessageHandler(HttpMessageHandler innerHandler, string cookieValue) : base(innerHandler)
    {
        _cookieValue = cookieValue;
    }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        request.Headers.Add("Cookie", $"x-access-token={_cookieValue}");
        return base.SendAsync(request, cancellationToken);
    }
}

public class RoomHubTests : IClassFixture<MongoFixture>, IAsyncLifetime
{
    private readonly MongoFixture _mongo;
    private readonly User _creator;
    private readonly User _member;
    private readonly Match _match;
    private readonly IDatabaseCollection _collection;
    private readonly HubConnection _creatorRoomHubClient;
    private readonly HubConnection _memberRoomHubClient;
    private readonly HubConnection _creatorLobbyHubClient;
    private readonly HubConnection _memberLobbyHubClient;

    public RoomHubTests(MongoFixture fixture)
    {
        _mongo = fixture;

        var jwtOptions = new JwtOptions
        {
            Key = "ThisIsADevelopmentKeyForTictactoeApplication12345",
            Issuer = "TictactoeIssuerDev",
            Audience = "TictactoeAudienceDev",
            AccessTokenMinutes = 60,
            RefreshTokenDays = 7
        };

        // Arrange - start factory with test jwt config and mongo fixture
        var database = fixture.Database;
        _collection = new TestDatabaseCollection(database, Guid.NewGuid().ToString());
        var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                services.AddSingleton(_mongo.Client);
                services.AddSingleton(_mongo.Database);

                services.AddSingleton<IDatabaseCollection>(_collection);
            });

            builder.ConfigureAppConfiguration((context, conf) =>
            {
                var settings = new Dictionary<string, string?>
                {
                    ["Jwt:Key"] = jwtOptions.Key,
                    ["Jwt:Issuer"] = jwtOptions.Issuer,
                    ["Jwt:Audience"] = jwtOptions.Audience,
                    ["Jwt:AccessTokenMinutes"] = jwtOptions.AccessTokenMinutes.ToString(),
                    ["Jwt:RefreshTokenDays"] = jwtOptions.RefreshTokenDays.ToString(),
                };

                conf.AddInMemoryCollection(settings);
            });
        });

        var tokenService = new TokenService(Options.Create(jwtOptions));
        _creator = new User
        {
            Id = ObjectId.GenerateNewId().ToString(),
            Email = "creator@example.com",
            HashedPassword = string.Empty,
            Salt = string.Empty
        };
        var creatorToken = tokenService.CreateAccessToken(_creator);
        _creatorRoomHubClient = new HubConnectionBuilder()
            .WithUrl(new Uri(factory.Server.BaseAddress, "/room"), options =>
            {
                options.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
                options.AccessTokenProvider = () => Task.FromResult<string?>(creatorToken);
            })
            .Build();
        _creatorLobbyHubClient = new HubConnectionBuilder()
            .WithUrl(new Uri(factory.Server.BaseAddress, "/lobby"), options =>
            {
                options.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
                options.AccessTokenProvider = () => Task.FromResult<string?>(creatorToken);
            })
            .Build();

        _member = new User
        {
            Id = ObjectId.GenerateNewId().ToString(),
            Email = "member@example.com",
            HashedPassword = string.Empty,
            Salt = string.Empty
        };
        var memberToken = tokenService.CreateAccessToken(_member);
        _memberRoomHubClient = new HubConnectionBuilder()
            .WithUrl(new Uri(factory.Server.BaseAddress, "/room"), options =>
            {
                options.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
                options.AccessTokenProvider = () => Task.FromResult<string?>(memberToken);
            })
            .Build();
        _memberLobbyHubClient = new HubConnectionBuilder()
            .WithUrl(new Uri(factory.Server.BaseAddress, "/lobby"), options =>
            {
                options.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
                options.AccessTokenProvider = () => Task.FromResult<string?>(memberToken);
            })
            .Build();

        _match = new Match
        {
            Id = ObjectId.GenerateNewId().ToString(),
            Name = "test-match",
            CreatorId = _creator.Id,
            MemberId = null,
            CreatorStatus = PlayerStatus.Left,
            MemberStatus = PlayerStatus.Left,
            CreatorMoves = 0,
            MemberMoves = 0,
            NextTurn = GameTurn.Creator,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            GameOutcome = GameOutcome.Going
        };
    }

    public async Task InitializeAsync()
    {
        await _collection.Matches.InsertOneAsync(_match);
        await _creatorRoomHubClient.StartAsync();
        await _creatorLobbyHubClient.StartAsync();
        await _memberRoomHubClient.StartAsync();
        await _memberLobbyHubClient.StartAsync();
    }

    public async Task DisposeAsync()
    {
        await _creatorRoomHubClient.DisposeAsync();
        await _creatorLobbyHubClient.DisposeAsync();
        await _memberRoomHubClient.DisposeAsync();
        await _memberLobbyHubClient.DisposeAsync();
    }

    [Fact(Timeout = 60000)] 
    public async Task JoinLobbyAndMakeMoves() {
        var creatorMatchUpdate = new TaskCompletionSource<MatchResults?>();
        var memberMatchUpdate = new TaskCompletionSource<MatchResults?>();
        _creatorRoomHubClient.On<MatchResults>(RoomHub.MatchUpdatedEvent, payload => creatorMatchUpdate.TrySetResult(payload));
        _memberRoomHubClient.On<MatchResults>(RoomHub.MatchUpdatedEvent, payload => memberMatchUpdate.TrySetResult(payload));

        var ms = await _collection.Matches.Find(u => true).ToListAsync();
        ms.Should().HaveCount(1);

        // join lobby should receive receive rooms
        var joinLobbyResp = await _creatorLobbyHubClient.InvokeAsync<MatchResultsWithError>("JoinLobby");
        joinLobbyResp.Should().NotBeNull();
        joinLobbyResp.Matches.Count().Should().Be(1);

        // creator joins a room
        var joinResp = await _creatorRoomHubClient.InvokeAsync<RoomActivityUpdateResponse>("UpdateRoomActivity", new RoomActivityUpdateRequest
        {
            RoomId = _match.Id!,
            RoomActivity = RoomActivity.JoinRoom
        });
        joinResp.Error.Should().BeNull();

        // member joins a room
        joinResp = await _memberRoomHubClient.InvokeAsync<RoomActivityUpdateResponse>("UpdateRoomActivity", new RoomActivityUpdateRequest
        {
            RoomId = _match.Id!,
            RoomActivity = RoomActivity.JoinRoom
        });
        joinResp.Error.Should().BeNull();

        // creator makes a move
        var makeMove = await _creatorRoomHubClient.InvokeAsync<RoomActivityUpdateResponse>("UpdateRoomActivity", new RoomActivityUpdateRequest
        {
            RoomId = _match.Id!,
            RoomActivity = RoomActivity.MakeMove,
            Move = 1
        });
        makeMove.Error.Should().BeNull();

        // assert the member received the update
        var completed = await Task.WhenAny(memberMatchUpdate.Task, Task.Delay(TimeSpan.FromSeconds(5)));
        completed.Should().BeSameAs(memberMatchUpdate.Task);
        var eventPayload = await memberMatchUpdate.Task;
        eventPayload.Should().NotBeNull();
        eventPayload!.Matches.Should().ContainSingle(m => m.Id == _match.Id);
    }
}
