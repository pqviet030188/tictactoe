using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Tictactoe;
using Tictactoe.Configurations.Options;
using Tictactoe.DTOs;
using Tictactoe.Models;
using Tictactoe.Services;
using Tictactoe.Types.Enums;
using Microsoft.Extensions.Configuration;
using Tictactoe.Hubs;
using MongoDB.Bson;
using Tictactoe.Types.Options;
using TictactoeTest.Helper;

namespace TictactoeTest.Integration.Hub;

public class RoomHubTests : IClassFixture<MongoFixture>
{
    // private readonly MongoFixture _mongo;

    // public RoomHubTests(MongoFixture mongo)
    // {
    //     _mongo = mongo;
    // }

    // [Fact]
    // public async Task RoomHub_EventDeliveredToGroupMembers()
    // {
    //     // Arrange - start factory with test jwt config and mongo fixture
    //     var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
    //     {
    //         builder.ConfigureServices(services =>
    //         {
    //             services.AddSingleton(_mongo.Client);
    //             services.AddSingleton(_mongo.Database);
    //         });

    //         builder.ConfigureAppConfiguration((context, conf) =>
    //         {
    //             var settings = new Dictionary<string, string?>
    //             {
    //                 ["Jwt:Key"] = "test_secret_key_for_integration_tests_12345",
    //                 ["Jwt:Issuer"] = "test",
    //                 ["Jwt:Audience"] = "test",
    //                 ["Jwt:AccessTokenMinutes"] = "60",
    //                 ["Jwt:RefreshTokenDays"] = "7",
    //             };

    //             conf.AddInMemoryCollection(settings);
    //         });
    //     });

    //     var jwtOptions = new JwtOptions
    //     {
    //         Key = "test_secret_key_for_integration_tests_12345",
    //         Issuer = "test",
    //         Audience = "test",
    //         AccessTokenMinutes = 60,
    //         RefreshTokenDays = 7
    //     };

    //     var tokenService = new TokenService(Options.Create(jwtOptions));

    //     var creator = new User
    //     {
    //         Id = ObjectId.GenerateNewId().ToString(),
    //         Email = "creator@example.com",
    //         HashedPassword = string.Empty,
    //         Salt = string.Empty
    //     };

    //     var creatorToken = tokenService.CreateAccessToken(creator);

    //     // Insert a match owned by creator
    //     var match = new Match
    //     {
    //         Id = ObjectId.GenerateNewId().ToString(),
    //         Name = "test-match",
    //         CreatorId = creator.Id,
    //         MemberId = null,
    //         CreatorStatus = PlayerStatus.Left,
    //         MemberStatus = PlayerStatus.Left,
    //         CreatorMoves = 0,
    //         MemberMoves = 0,
    //         NextTurn = GameTurn.Creator,
    //         CreatedAt = DateTime.UtcNow,
    //         UpdatedAt = DateTime.UtcNow,
    //         GameOutcome = GameOutcome.Going
    //     };

    //     await _mongo.Database.GetCollection<Match>("matches").InsertOneAsync(match);


    //     // Build two connections that both act as the creator (so they can join)
    //     var receiver = new HubConnectionBuilder()
    //         .WithUrl(new Uri(factory.Server.BaseAddress, "/room"), options =>
    //         {
    //             options.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
    //             options.AccessTokenProvider = () => Task.FromResult<string?>(creatorToken);
    //         })
    //         .Build();

    //     var actor = new HubConnectionBuilder()
    //         .WithUrl(new Uri(factory.Server.BaseAddress, "/room"), options =>
    //         {
    //             options.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
    //             options.AccessTokenProvider = () => Task.FromResult<string?>(creatorToken);
    //         })
    //         .Build();

    //     await receiver.StartAsync();
    //     await actor.StartAsync();

    //     var tcs = new TaskCompletionSource<MatchResults?>();
    //     receiver.On<MatchResults>(RoomHub.MatchUpdatedEvent, payload => tcs.TrySetResult(payload));

    //     // Also create a Lobby client to assert lobby receives MatchesUpdatedEvent
    //     var lobbyTcs = new TaskCompletionSource<MatchResults?>();
    //     var lobbyReceiver = new HubConnectionBuilder()
    //         .WithUrl(new Uri(factory.Server.BaseAddress, "/lobby"), options =>
    //         {
    //             options.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
    //             options.AccessTokenProvider = () => Task.FromResult<string?>(creatorToken);
    //         })
    //         .Build();

    //     await lobbyReceiver.StartAsync();
    //     lobbyReceiver.On<MatchResults>(LobbyHub.MatchesUpdatedEvent, payload => lobbyTcs.TrySetResult(payload));

    //     // Join the global lobby group so this client will receive lobby notifications
    //     var joinLobbyResp = await lobbyReceiver.InvokeAsync<MatchResultsWithError>("JoinLobby", new RequestWithAuth() { AccessToken = creatorToken });
    //     joinLobbyResp.Should().NotBeNull();

    //     // Receiver joins the room (adds to group)
    //     var joinReq = new RoomActivityUpdateRequest
    //     {
    //         RoomId = match.Id,
    //         RoomActivity = RoomActivity.JoinRoom,
    //         AccessToken = creatorToken
    //     };

    //     var joinResp = await receiver.InvokeAsync<RoomActivityUpdateResponse>("UpdateRoomActivity", joinReq);
    //     joinResp.Error.Should().BeNull();

    //     // Actor makes a move to trigger group notification
    //     var moveReq = new RoomActivityUpdateRequest
    //     {
    //         RoomId = match.Id,
    //         RoomActivity = RoomActivity.MakeMove,
    //         Move = 1,
    //         AccessToken = creatorToken
    //     };

    //     var actorResp = await actor.InvokeAsync<RoomActivityUpdateResponse>("UpdateRoomActivity", moveReq);
    //     actorResp.Error.Should().BeNull();

    //     // Wait for event
    //     var completed = await Task.WhenAny(tcs.Task, Task.Delay(TimeSpan.FromSeconds(5)));
    //     completed.Should().BeSameAs(tcs.Task);
    //     var eventPayload = await tcs.Task;
    //     eventPayload.Should().NotBeNull();
    //     eventPayload!.Matches.Should().ContainSingle(m => m.Id == match.Id);

    //     await receiver.DisposeAsync();
    //     await actor.DisposeAsync();
    // }

    // [Fact]
    // public async Task UpdateRoomActivity_WithValidToken_ReturnsInvalidMatchOperation()
    // {
    //     // Arrange - create factory with test Jwt options and replace Mongo services with in-memory test fixture
    //     var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
    //     {
    //         builder.ConfigureServices(services =>
    //         {
    //             // Use the Mongo2Go client & database from fixture
    //             services.AddSingleton(_mongo.Client);
    //             services.AddSingleton(_mongo.Database);
    //         });

    //         builder.ConfigureAppConfiguration((context, conf) =>
    //         {
    //             var settings = new Dictionary<string, string?>
    //             {
    //                 ["Jwt:Key"] = "test_secret_key_for_integration_tests_12345",
    //                 ["Jwt:Issuer"] = "test",
    //                 ["Jwt:Audience"] = "test",
    //                 ["Jwt:AccessTokenMinutes"] = "60",
    //                 ["Jwt:RefreshTokenDays"] = "7",
    //             };

    //             conf.AddInMemoryCollection(settings);
    //         });
    //     });

    //     var jwtOptions = new JwtOptions
    //     {
    //         Key = "test_secret_key_for_integration_tests_12345",
    //         Issuer = "test",
    //         Audience = "test",
    //         AccessTokenMinutes = 60,
    //         RefreshTokenDays = 7
    //     };

    //     var tokenService = new TokenService(Options.Create(jwtOptions));

    //     var user = new User
    //     {
    //         Id = ObjectId.GenerateNewId().ToString(),
    //         Email = "test@example.com",
    //         HashedPassword = string.Empty,
    //         Salt = string.Empty
    //     };

    //     var accessToken = tokenService.CreateAccessToken(user);

    //     // Build Hub connection with AccessTokenProvider to put token into the Authorisation header/negotiate
    //     var connection = new HubConnectionBuilder()
    //         .WithUrl(new Uri(factory.Server.BaseAddress, "/room"), options =>
    //         {
    //              options.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
    //              options.AccessTokenProvider = () => Task.FromResult<string?>(accessToken);
    //         })
    //         .Build();

    //     await connection.StartAsync();

    //     var request = new RoomActivityUpdateRequest
    //     {
    //         RoomId = "nonexistent-room",
    //             RoomActivity = RoomActivity.JoinRoom,
    //         AccessToken = accessToken
    //     };

    //     // Act
    //     var response = await connection.InvokeAsync<RoomActivityUpdateResponse>("UpdateRoomActivity", request);

    //     // Assert - authenticated but no such match -> InvalidMatchOperation error
    //     response.Should().NotBeNull();
    //     response.Error.Should().NotBeNull();
    //     response.Error!.ErrorCode.Should().Be("INVALID_MATCH_OPERATION");

    //     await connection.DisposeAsync();
    // }

    // [Fact]
    // public async Task UpdateRoomActivity_WithoutTokenInHeader_ButEmptyAccessTokenInPayload_ReturnsAuthError()
    // {
    //     var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
    //     {
    //         builder.ConfigureServices(services =>
    //         {
    //             services.AddSingleton(_mongo.Client);
    //             services.AddSingleton(_mongo.Database);
    //         });

    //         builder.ConfigureAppConfiguration((context, conf) =>
    //         {
    //             var settings = new Dictionary<string, string?>
    //             {
    //                 ["Jwt:Key"] = "test_secret_key_for_integration_tests_12345",
    //                 ["Jwt:Issuer"] = "test",
    //                 ["Jwt:Audience"] = "test",
    //                 ["Jwt:AccessTokenMinutes"] = "60",
    //                 ["Jwt:RefreshTokenDays"] = "7",
    //             };

    //             conf.AddInMemoryCollection(settings);
    //         });
    //     });

    //     // Build connection WITHOUT AccessTokenProvider (no header)
    //     var connection = new HubConnectionBuilder()
    //         .WithUrl(new Uri(factory.Server.BaseAddress, "/room"), options =>
    //         {
    //             options.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
    //         })
    //         .Build();

    //     await connection.StartAsync();

    //     var request = new RoomActivityUpdateRequest
    //     {
    //         RoomId = "any-room",
    //             RoomActivity = RoomActivity.JoinRoom,
    //         AccessToken = string.Empty // explicit empty -> filter should create typed auth error
    //     };

    //     var response = await connection.InvokeAsync<RoomActivityUpdateResponse>("UpdateRoomActivity", request);

    //     response.Should().NotBeNull();
    //     response.Error.Should().NotBeNull();
    //     response.Error!.ErrorCode.Should().Be("AUTHENTICATION_FAILED");

    //     await connection.DisposeAsync();
    // }
}
