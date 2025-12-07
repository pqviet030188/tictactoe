using System.Reflection;
using Microsoft.AspNetCore.SignalR;
using Tictactoe.DTOs;
using Tictactoe.Types.Attributes;
using Tictactoe.Types.Interfaces;
using Tictactoe.Extensions;
using Tictactoe.Types.Enums;

namespace Tictactoe.Hubs.Filters;

public class RoomHubFilter : IHubFilter
{
    private readonly IMatchRepository _matchRepository;

    public RoomHubFilter(IMatchRepository matchRepository)
    {
        _matchRepository = matchRepository;
    }

    public async ValueTask<object?> InvokeMethodAsync(HubInvocationContext context, Func<HubInvocationContext, ValueTask<object?>> next)
    {
        // If the target method doesn't declare [QueryToken], do nothing here.
        var methodInfo = context.HubMethod;
        if (methodInfo == null || methodInfo.GetCustomAttribute<UseRoomAuthorisationAttribute>() == null)
        {
            return next(context);
        }

        // 1) Prefer first argument if it implements IWithRoomMessage to obtain RoomId
        string? roomId = null;
        if (context.HubMethodArguments != null && context.HubMethodArguments.Count > 0)
        {
            var firstArg = context.HubMethodArguments[0];
            if (firstArg is IWithRoomMessage roomMsg)
            {
                roomId = roomMsg.RoomId;
            }
        }

        if (string.IsNullOrEmpty(roomId))
        {
            var error = RoomErrorCatalog.InvalidMatchOperation("Room ID not provided for authorisation.");
            return ValueTask.FromResult<object?>(CreateAuthErrorOrThrow(methodInfo, error));
        }

        // Fetch match raw (no membership filtering) so we can inspect occupancy
        var match = await _matchRepository.GetById(roomId, context.Context.ConnectionAborted);
        if (match == null)
        {
            var error = RoomErrorCatalog.MatchNotFound(roomId);
            return ValueTask.FromResult<object?>(CreateAuthErrorOrThrow(methodInfo, error));
        }

        // Combine user in context with room to make authorisation decision
        var callerId = context.Context.User?.GetUserId() ?? string.Empty;
        if (!
            (
                (!string.IsNullOrEmpty(callerId)) &&
                (
                // Creator is caller
                (!string.IsNullOrEmpty(match.CreatorId) && match.CreatorId == callerId)
                ||
                // Member is caller
                (!string.IsNullOrEmpty(match.CreatorId) && !string.IsNullOrEmpty(match.MemberId) && match.MemberId == callerId)
                ||
                // No members yet and caller is joining as creator
                (!string.IsNullOrEmpty(match.CreatorId) && string.IsNullOrEmpty(match.MemberId) && match.MemberMoves == 0 && match.MemberStatus == PlayerStatus.Left)
                )
            )
        )
        {
            var error = RoomErrorCatalog.AuthorisationFailed(roomId);
            return ValueTask.FromResult<object?>(CreateAuthErrorOrThrow(methodInfo, error));
        }

        // authorised or not a method that needs room auth — proceed
        return await next(context);
    }

    public Task OnConnectedAsync(HubLifetimeContext context, Func<HubLifetimeContext, Task> next) => next(context);

    public Task OnDisconnectedAsync(HubLifetimeContext context, Exception? exception, Func<HubLifetimeContext, Exception?, Task> next) => next(context, exception);

    private object CreateAuthErrorOrThrow(MethodInfo methodInfo, AppError error)
    {

        // Try create an instance of declared payload and set its Error property if available
        if (TryCreateTypedErrorResponse(methodInfo, error, out var typedResponse))
            return typedResponse!;

        // Fallback: if the declared payload type itself is ErrorResponse or has compatible shape
        if (TryCreateSimpleErrorResponse(methodInfo, error, out var simple))
            return simple!;

        // If method returns no payload (Task/void) we cannot return an object — throw a HubException
        throw new HubException(error.ErrorDetailMessage);
    }

    // Create instance of the method's payload type (Task<T> -> T) and set its `Error` property if possible.
    private static bool TryCreateTypedErrorResponse(MethodInfo methodInfo, AppError appError, out object? response)
    {
        response = null;
        var payloadType = GetPayloadType(methodInfo);
        if (payloadType == null)
            return false;

        var errorProp = payloadType.GetProperty("Error", BindingFlags.Public | BindingFlags.Instance);
        if (errorProp == null || !errorProp.CanWrite || !errorProp.PropertyType.IsAssignableFrom(typeof(AppError)))
            return false;

        object? instance;
        try
        {
            instance = Activator.CreateInstance(payloadType);
        }
        catch
        {
            return false;
        }

        if (instance == null)
            return false;

        try
        {
            errorProp.SetValue(instance, appError);
            response = instance;
            return true;
        }
        catch
        {
            response = null;
            return false;
        }
    }

    // If typed response not available, try to return a generic ErrorResponse when compatible with the declared return.
    private static bool TryCreateSimpleErrorResponse(MethodInfo methodInfo, AppError appError, out object? response)
    {
        response = null;
        var payloadType = GetPayloadType(methodInfo);
        if (payloadType == null)
            return false;

        // If payloadType is ErrorResponse or assignable from ErrorResponse, create and return ErrorResponse.
        if (payloadType.IsAssignableFrom(typeof(ErrorResponse)))
        {
            response = new ErrorResponse { Error = appError };
            return true;
        }

        // Also allow if payload has property Error of type AppError (covered in typed path) — nothing more to do here.
        return false;
    }

    private static Type? GetPayloadType(MethodInfo methodInfo)
    {
        var returnType = methodInfo.ReturnType;

        if (returnType == typeof(void) || returnType == typeof(Task))
            return null;

        if (returnType.IsGenericType)
        {
            var genDef = returnType.GetGenericTypeDefinition();
            if (genDef == typeof(Task<>) || genDef == typeof(ValueTask<>))
                return returnType.GetGenericArguments()[0];
        }

        return returnType;
    }
}