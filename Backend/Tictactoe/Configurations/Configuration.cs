using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using FluentValidation;
using FluentValidation.AspNetCore;
using Tictactoe.Configurations.Options;
using Tictactoe.DTOs;
using Tictactoe.Hubs.Filters;
using Tictactoe.Repositories;
using Tictactoe.Services;
using Tictactoe.Types.Interfaces;
using Tictactoe.Types.Options;

namespace Tictactoe.Configurations;

public static class Configurations 
{
    public static void AddOptions(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<RedisOptions>(
            configuration.GetSection(RedisOptions.OptionSection)
        );

        services.Configure<MongoDbOptions>(
            configuration.GetSection(MongoDbOptions.OptionSection)
        );

        services.Configure<JwtOptions>(
            configuration.GetSection(JwtOptions.OptionSection)
        );
    }

    public static void AddServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<IComputationService, ComputationService>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IMatchRepository, MatchRepository>();
        services.AddScoped<IDatabaseCollection, DatabaseCollection>();
        services.AddSingleton<ITokenService, TokenService>();

        services.AddHttpContextAccessor();
        
        // Add FluentValidation with automatic validation
        services.AddValidatorsFromAssemblyContaining<RegisterRequestValidator>();
        services.AddFluentValidationAutoValidation();

        var signalRService = services.AddSignalR(options =>
        {
            options.AddFilter<AccessTokenHubFilter>();
            options.AddFilter<RoomHubFilter>();
        });
        
        var (redisOptions, mongoDbOptions, _) = configuration.GetConfigs();

        if (redisOptions != null)
        {
            signalRService.AddStackExchangeRedis(redisOptions.ConnectionString);
        }

        if (mongoDbOptions != null) {
            // Register Mongo client
            services.AddSingleton<IMongoClient>(sp =>
            {
                var options = sp.GetRequiredService<IOptions<MongoDbOptions>>().Value;
                var settings = MongoClientSettings.FromConnectionString(options.ConnectionString);
                settings.MaxConnectionPoolSize = 200;
                settings.MinConnectionPoolSize = 5;
                settings.WaitQueueTimeout = TimeSpan.FromSeconds(60);

                return new MongoClient(settings);
            });

            // Register Mongo Database
            services.AddSingleton(sp =>
            {
                var options = sp.GetRequiredService<IOptions<MongoDbOptions>>().Value;
                var client = sp.GetRequiredService<IMongoClient>();
                var mongoUrl = MongoUrl.Create(options.ConnectionString);
                var dbName = mongoUrl?.DatabaseName ?? client.Settings?.Credential?.Source;
                return client.GetDatabase(dbName);
            });
        }
    }

    public static (RedisOptions? redisOptions, MongoDbOptions? mongoDbOptions, CorsPolicyOptions? corsPolicyOptions) GetConfigs(this IConfiguration configuration)
    {
        var redisOptions = configuration.GetSection(RedisOptions.OptionSection).Get<RedisOptions>();
        var mongoDbOptions = configuration.GetSection(MongoDbOptions.OptionSection).Get<MongoDbOptions>();

        var corsPolicyOptions = configuration
            .GetSection(CorsPolicyOptions.OptionSection)
            .Get<CorsPolicyOptions>();

        return (redisOptions, mongoDbOptions, corsPolicyOptions);
    }
}