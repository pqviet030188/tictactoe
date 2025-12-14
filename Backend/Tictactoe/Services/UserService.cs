using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Tictactoe.DTOs;
using Tictactoe.Models;
using Tictactoe.Types.Interfaces;
using Tictactoe.Configurations.Options;

namespace Tictactoe.Services;

public class UserService(IUserRepository userRepository, 
    IOptions<JwtOptions> jwtOptions, ITokenService tokenService,
    IHttpContextAccessor httpContextAccessor
) : IUserService
{
    private readonly JwtOptions _jwtOptions = jwtOptions.Value;

    public async Task<User> CreateUser(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        return await userRepository.Create(request.Email, request.Password, cancellationToken);
    }

    public async Task<User?> GetUserById(string userId, CancellationToken cancellationToken = default)
    {
        return await userRepository.GetById(userId, cancellationToken);
    }

    public async Task<AuthResponse> Login(string email, string password, CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByEmailAndPassword(email, password, cancellationToken);
        if (user == null) 
        {
            throw new UnauthorizedAccessException("Invalid credentials");
        }

        var accessToken = tokenService.CreateAccessToken(user);
        var refreshToken = tokenService.CreateRefreshToken(user);
        return new AuthResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresIn = _jwtOptions.AccessTokenMinutes * 60
        };
    }

    public async Task<AuthResponse> Refresh(string refreshToken, CancellationToken cancellationToken = default)
    {
        try
        {
            if (string.IsNullOrEmpty(refreshToken)) 
            {
                // await Logout(cancellationToken);
                throw new UnauthorizedAccessException("Invalid refresh token");
            }

            var handler = new JwtSecurityTokenHandler();
            var validationParams = TokenService.GetTokenValidationParameters(_jwtOptions);
            var principal = handler.ValidateToken(refreshToken, validationParams, out var validatedToken);
            var jwt = validatedToken as JwtSecurityToken;
            if (jwt == null || principal == null || principal.FindFirst("token_use")?.Value != "refresh")
                throw new UnauthorizedAccessException("Invalid refresh token");

            var userId = principal.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) throw new UnauthorizedAccessException("Invalid refresh token");

            var user = await userRepository.GetById(userId, cancellationToken);
            if (user == null) throw new UnauthorizedAccessException("Invalid refresh token");
            
            var newAccessToken = tokenService.CreateAccessToken(user);
            var newRefreshToken = tokenService.CreateRefreshToken(user);
            
            return new AuthResponse
            {
                AccessToken = newAccessToken,
                RefreshToken = newRefreshToken,
                ExpiresIn = _jwtOptions.AccessTokenMinutes * 60
            };
        }
        catch (SecurityTokenException)
        {
            throw new UnauthorizedAccessException("Invalid refresh token");
        }
    }

    private void SetAuthCookies(string accessToken, string refreshToken)
    {
        var context = httpContextAccessor.HttpContext;
        if (context == null) return;

        // Set access token cookie with shorter expiration
        var accessCookieOptions = new CookieOptions
        {
            HttpOnly = false,
            // for now, in dev we are not using https
            Secure = false,
            SameSite = SameSiteMode.Lax,
            Path = "/",
            Expires = DateTimeOffset.UtcNow.AddMinutes(_jwtOptions.AccessTokenMinutes - 2)
        };
        context.Response.Cookies.Append("x-access-token", accessToken, accessCookieOptions);

        // Set refresh token cookie with longer expiration
        var refreshCookieOptions = new CookieOptions
        {
            HttpOnly = false,
            Secure = false,
            SameSite = SameSiteMode.Lax,
            Path = "/",
            Expires = DateTimeOffset.UtcNow.AddDays(_jwtOptions.RefreshTokenDays - 1)
        };
        context.Response.Cookies.Append("x-refresh-token", refreshToken, refreshCookieOptions);
    }

    public Task Logout(CancellationToken cancellationToken = default)
    {
        var context = httpContextAccessor.HttpContext;
        if (context == null) return Task.CompletedTask;

        var cookieOptions = new CookieOptions
        {
            HttpOnly = false,
            Secure = false,
            SameSite = SameSiteMode.Lax,
            Path = "/",
            Expires = DateTimeOffset.UtcNow.AddDays(-1) // Set to past date to delete
        };

        context.Response.Cookies.Append("x-access-token", "", cookieOptions);
        context.Response.Cookies.Append("x-refresh-token", "", cookieOptions);
        return Task.CompletedTask;
    }
}