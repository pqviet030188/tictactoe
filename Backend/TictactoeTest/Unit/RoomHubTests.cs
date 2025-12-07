using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Moq;
using FluentAssertions;
using Tictactoe.Hubs;
using Tictactoe.Models;
using Tictactoe.DTOs;
using Tictactoe.Types.Interfaces;
using Tictactoe.Extensions;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Tictactoe.Types.Enums;
using MongoDB.Bson;
using Match = Tictactoe.Models.Match;

namespace TictactoeTest.Unit;

public class RoomHubUnitTests
{
    // private readonly Mock<IMatchRepository> _mockMatchRepo;
    // private readonly Mock<IGroupManager> _mockGroups;
    // private readonly Mock<IClientProxy> _mockClientProxy;
    // private readonly Mock<IHubCallerClients> _mockClients;
    // private readonly RoomHub _roomHub;

    // public RoomHubUnitTests()
    // {
    //     _mockMatchRepo = new Mock<IMatchRepository>();
    //     _mockGroups = new Mock<IGroupManager>();
    //     _mockClientProxy = new Mock<IClientProxy>();
    //     _mockClients = new Mock<IHubCallerClients>();
        
    //     _roomHub = new RoomHub(_mockMatchRepo.Object);
        
    //     // Setup hub context
    //     var mockContext = new Mock<HubCallerContext>();
    //     mockContext.Setup(x => x.ConnectionId).Returns("test-connection-id");
    //     mockContext.Setup(x => x.User).Returns(CreateTestUser("test-user-id"));
        
    //     // Setup hub properties using reflection
    //     typeof(Hub).GetProperty("Context")!.SetValue(_roomHub, mockContext.Object);
    //     typeof(Hub).GetProperty("Groups")!.SetValue(_roomHub, _mockGroups.Object);
    //     typeof(Hub).GetProperty("Clients")!.SetValue(_roomHub, _mockClients.Object);
        
    //     _mockClients.Setup(x => x.Group(It.IsAny<string>())).Returns(_mockClientProxy.Object);
    // }

    // private ClaimsPrincipal CreateTestUser(string userId)
    // {
    //     var claims = new[]
    //     {
    //         new Claim("sub", userId),
    //         new Claim("email", "test@example.com")
    //     };
    //     return new ClaimsPrincipal(new ClaimsIdentity(claims, "test"));
    // }

    // [Fact]
    // public async Task UpdateRoomActivity_JoinRoom_Success_ReturnsUpdatedMatch()
    // {
    //     // Arrange
    //     var userId = "test-user-id";
    //     var matchId = ObjectId.GenerateNewId().ToString();
    //     var updatedMatch = new Match
    //     {
    //         Id = matchId,
    //         Name = "Test Match",
    //         CreatorId = userId,
    //         CreatorStatus = PlayerStatus.Joined,
    //         MemberStatus = PlayerStatus.Left
    //     };

    //     var request = new RoomActivityUpdateRequest
    //     {
    //         RoomId = matchId,
    //         RoomActivity = RoomActivity.JoinRoom,
    //         AccessToken = "test-token"
    //     };

    //     _mockMatchRepo
    //         .Setup(x => x.UpdatePlayer(matchId, userId, PlayerStatus.Joined, It.IsAny<CancellationToken>()))
    //         .ReturnsAsync(updatedMatch);

    //     // Act
    //     var result = await _roomHub.UpdateRoomActivity(request);

    //     // Assert
    //     result.Should().NotBeNull();
    //     result.Error.Should().BeNull();
    //     result.Match.Should().NotBeNull();
    //     result.Match!.Id.Should().Be(matchId);
    //     result.Match.CreatorStatus.Should().Be(PlayerStatus.Joined);

    //     // Verify user was added to room group
    //     _mockGroups.Verify(x => x.AddToGroupAsync(
    //         "test-connection-id",
    //         RoomHub.MatchNotificationGroup(matchId),
    //         It.IsAny<CancellationToken>()),
    //         Times.Once);

    //     // Verify notifications were sent
    //     _mockClientProxy.Verify(x => x.SendCoreAsync(
    //         RoomHub.MatchUpdatedEvent,
    //         It.IsAny<object[]>(),
    //         It.IsAny<CancellationToken>()),
    //         Times.Exactly(2)); // Once for room group, once for lobby group
    // }

    // [Fact]
    // public async Task UpdateRoomActivity_LeaveRoom_Success_RemovesFromGroup()
    // {
    //     // Arrange
    //     var userId = "test-user-id";
    //     var matchId = ObjectId.GenerateNewId().ToString();
    //     var updatedMatch = new Match
    //     {
    //         Id = matchId,
    //         Name = "Test Match",
    //         CreatorId = userId,
    //         CreatorStatus = PlayerStatus.Left
    //     };

    //     var request = new RoomActivityUpdateRequest
    //     {
    //         RoomId = matchId,
    //         RoomActivity = RoomActivity.LeaveRoom,
    //         AccessToken = "test-token"
    //     };

    //     _mockMatchRepo
    //         .Setup(x => x.UpdatePlayer(matchId, userId, PlayerStatus.Left, It.IsAny<CancellationToken>()))
    //         .ReturnsAsync(updatedMatch);

    //     // Act
    //     var result = await _roomHub.UpdateRoomActivity(request);

    //     // Assert
    //     result.Should().NotBeNull();
    //     result.Error.Should().BeNull();
    //     result.Match.Should().NotBeNull();

    //     // Verify user was removed from room group
    //     _mockGroups.Verify(x => x.RemoveFromGroupAsync(
    //         "test-connection-id",
    //         RoomHub.MatchNotificationGroup(matchId),
    //         It.IsAny<CancellationToken>()),
    //         Times.Once);
    // }

    // [Fact]
    // public async Task UpdateRoomActivity_MakeMove_Success_UpdatesMatchWithMove()
    // {
    //     // Arrange
    //     var userId = "test-user-id";
    //     var matchId = ObjectId.GenerateNewId().ToString();
    //     var move = (ushort)5;
    //     var existingMatch = new Match
    //     {
    //         Id = matchId,
    //         Name = "Test Match",
    //         CreatorId = userId,
    //         MemberId = "other-user",
    //         CreatorStatus = PlayerStatus.Joined,
    //         MemberStatus = PlayerStatus.Joined
    //     };

    //     var updatedMatch = new Match
    //     {
    //         Id = matchId,
    //         Name = "Test Match",
    //         CreatorId = userId,
    //         MemberId = "other-user",
    //         CreatorMoves = move,
    //         CreatorStatus = PlayerStatus.Joined,
    //         MemberStatus = PlayerStatus.Joined,
    //         GameOutcome = GameOutcome.Going
    //     };

    //     var request = new RoomActivityUpdateRequest
    //     {
    //         RoomId = matchId,
    //         RoomActivity = RoomActivity.MakeMove,
    //         Move = move,
    //         AccessToken = "test-token"
    //     };

    //     _mockMatchRepo
    //         .Setup(x => x.GetById(userId, matchId, It.IsAny<CancellationToken>()))
    //         .ReturnsAsync(existingMatch);

    //     _mockMatchRepo
    //         .Setup(x => x.UpdatePlayer(matchId, userId, move, GameOutcome.Going, It.IsAny<CancellationToken>()))
    //         .ReturnsAsync(updatedMatch);

    //     // Act
    //     var result = await _roomHub.UpdateRoomActivity(request);

    //     // Assert
    //     result.Should().NotBeNull();
    //     result.Error.Should().BeNull();
    //     result.Match.Should().NotBeNull();
    //     result.Match!.CreatorMoves.Should().Be(move);

    //     // Verify repository calls
    //     _mockMatchRepo.Verify(x => x.GetById(userId, matchId, It.IsAny<CancellationToken>()), Times.Once);
    //     _mockMatchRepo.Verify(x => x.UpdatePlayer(matchId, userId, move, GameOutcome.Going, It.IsAny<CancellationToken>()), Times.Once);
    // }

    // [Fact]
    // public async Task UpdateRoomActivity_MatchNotFound_ReturnsError()
    // {
    //     // Arrange
    //     var userId = "test-user-id";
    //     var matchId = "nonexistent-match-id";
    //     var request = new RoomActivityUpdateRequest
    //     {
    //         RoomId = matchId,
    //         RoomActivity = RoomActivity.JoinRoom,
    //         AccessToken = "test-token"
    //     };

    //     _mockMatchRepo
    //         .Setup(x => x.UpdatePlayer(matchId, userId, PlayerStatus.Joined, It.IsAny<CancellationToken>()))!
    //         .ReturnsAsync((Match?)null);

    //     // Act
    //     var result = await _roomHub.UpdateRoomActivity(request);

    //     // Assert
    //     result.Should().NotBeNull();
    //     result.Match.Should().BeNull();
    //     result.Error.Should().NotBeNull();
    //     result.Error!.ErrorCode.Should().Be("INVALID_MATCH_OPERATION");
    // }

    // [Fact]
    // public async Task UpdateRoomActivity_MakeMove_MatchNotFound_ReturnsMatchNotFoundError()
    // {
    //     // Arrange
    //     var userId = "test-user-id";
    //     var matchId = "nonexistent-match-id";
    //     var request = new RoomActivityUpdateRequest
    //     {
    //         RoomId = matchId,
    //         RoomActivity = RoomActivity.MakeMove,
    //         Move = 1,
    //         AccessToken = "test-token"
    //     };

    //     _mockMatchRepo
    //         .Setup(x => x.GetById(userId, matchId, It.IsAny<CancellationToken>()))
    //         .ReturnsAsync((Match?)null);

    //     // Act
    //     var result = await _roomHub.UpdateRoomActivity(request);

    //     // Assert
    //     result.Should().NotBeNull();
    //     result.Match.Should().BeNull();
    //     result.Error.Should().NotBeNull();
    //     result.Error!.ErrorCode.Should().Be("MATCH_NOT_FOUND");
    // }

    // [Fact]
    // public async Task UpdateRoomActivity_InvalidActivity_ReturnsError()
    // {
    //     // Arrange
    //     var request = new RoomActivityUpdateRequest
    //     {
    //         RoomId = "some-match-id",
    //         RoomActivity = (RoomActivity)999, // Invalid activity
    //         AccessToken = "test-token"
    //     };

    //     // Act
    //     var result = await _roomHub.UpdateRoomActivity(request);

    //     // Assert
    //     result.Should().NotBeNull();
    //     result.Match.Should().BeNull();
    //     result.Error.Should().NotBeNull();
    //     result.Error!.ErrorCode.Should().Be("INVALID_MATCH_OPERATION");
    //     result.Error.ErrorMessage.Should().Contain("invalid request");
    // }
}