using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Tictactoe.Types.Interfaces;
using Tictactoe.DTOs;
using Tictactoe.Extensions;

namespace Tictactoe.Controllers;

[ApiController]
[Route("[controller]")]
public class AuthController(IUserService userService) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req, CancellationToken cancellationToken)
    {
        try
        {
            var createdUser = await userService.CreateUser(req, cancellationToken);
            return Ok(new { message = "Account created successfully!" });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to create account", error = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req, CancellationToken cancellationToken)
    {
        try 
        {
            return Ok(await userService.Login(req.Email, req.Password, cancellationToken));
        } 
        catch (UnauthorizedAccessException) 
        {
            return Unauthorized(new { message = "Invalid credentials" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to login", error = ex.Message });
        }
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest req, CancellationToken cancellationToken)
    {
        try 
        {
            return Ok(await userService.Refresh(req.RefreshToken, cancellationToken));
        } 
        catch (UnauthorizedAccessException) 
        {
            return Unauthorized(new { message = "Invalid refresh token" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to refresh token", error = ex.Message });
        }
    }

    [HttpGet("user")]
    [Authorize]
    public async Task<IActionResult> GetUser(CancellationToken cancellationToken)
    {
        try {
            var userId = User.GetUserId();
            var user = await userService.GetUserById(userId, cancellationToken);
            if (user == null)
                return NotFound(new { message = "User not found" });

            return Ok(user);
        } catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to get user", error = ex.Message });
        }
    }

    [HttpGet("logout")]
    [Authorize]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        try {
            await userService.Logout(cancellationToken);
            return Ok(new { message = "Logged out successfully" });
        } catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to get user", error = ex.Message });
        }
    }
}
