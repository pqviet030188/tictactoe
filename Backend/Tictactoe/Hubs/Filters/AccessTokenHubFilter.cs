using System.Reflection;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;
using Tictactoe.Configurations.Options;
using Tictactoe.Types.Attributes;
using Tictactoe.DTOs;
namespace Tictactoe.Hubs.Filters;

public class AccessTokenHubFilter : IHubFilter
{
    private readonly JwtOptions _jwtOptions;

    public AccessTokenHubFilter(IOptions<JwtOptions> jwtOptions)
    {
        _jwtOptions = jwtOptions.Value;
    }

    public async ValueTask<object?> InvokeMethodAsync(HubInvocationContext context, Func<HubInvocationContext, ValueTask<object?>> next)
    {
        // If the target method doesn't declare the attribute, do nothing here.
        var methodInfo = context.HubMethod;
        if (methodInfo == null || methodInfo.GetCustomAttribute<UseAuthenticationAttribute>() == null)
        {
            return await next(context);
        }

        var user = context.Context.User;
        if (user == null || user.Identity == null || !user.Identity.IsAuthenticated)
        {
            return await ValueTask.FromResult<object?>(CreateAuthErrorOrThrow(methodInfo, "Authentication required but no valid user context found."));
        }

        return await next(context);
    }

    // For connect/disconnect we don't need to change behavior here
    public Task OnConnectedAsync(HubLifetimeContext context, Func<HubLifetimeContext, Task> next) => next(context);

    public Task OnDisconnectedAsync(HubLifetimeContext context, Exception? exception, Func<HubLifetimeContext, Exception?, Task> next) => next(context, exception);

    // Create an error object in the return type expected by the method, or fallback to ErrorResponse or throw.
    private object CreateAuthErrorOrThrow(MethodInfo methodInfo, string message)
    {
        var appError = RoomErrorCatalog.AuthenticationFailed(message);

        // Try create an instance of declared payload and set its Error property if available
        if (TryCreateTypedErrorResponse(methodInfo, appError, out var typedResponse))
            return typedResponse!;

        // Fallback: if the declared payload type itself is ErrorResponse or has compatible shape
        if (TryCreateSimpleErrorResponse(methodInfo, appError, out var simple))
            return simple!;

        // If method returns no payload (Task/void) we cannot return an object — throw a HubException
        throw new HubException(message);
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