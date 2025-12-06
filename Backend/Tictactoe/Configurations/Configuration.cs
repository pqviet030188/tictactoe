using Microsoft.Extensions.Options;
using MongoDB.Driver;
using Tictactoe.Configurations.Options;
using Tictactoe.Repositories;
using Tictactoe.Services;
using Tictactoe.Types.Interfaces;

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
    }

    public static void AddServices(this IServiceCollection services, IConfiguration configuration, bool applyMigration)
    {
        services.AddScoped<IComputationService, ComputationService>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IDatabaseCollection, DatabaseCollection>();

        var signalRService = services.AddSignalR();
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
                return client.GetDatabase(client.Settings.Credential.Source);
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