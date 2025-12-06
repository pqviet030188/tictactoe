using Tictactoe.Services;
using Tictactoe.Configurations;
using Tictactoe.Hubs;
using CSharp.Mongo.Migration.Core;
using CSharp.Mongo.Migration.Core.Locators;
using System.Reflection;
using Semver;
namespace Tictactoe;

public class Program
{
    public static void Main(string[] args)
    {
        var migrate = args.Contains("--migrate");
        var revert = args.Contains("--revert");
        var revertVersion = revert == false? null: args.SkipWhile(arg => arg != "--revert")?.Skip(1)?.FirstOrDefault();

        if (revert && revertVersion == null)
        {
            throw new InvalidOperationException("Revert version is expected to be provided if revert command is specified");
        }

        var builder = WebApplication.CreateBuilder(args);
        builder.Services.AddOptions(builder.Configuration);
        var (redisOptions, mongoDbOptions, corsPolicyOptions) = builder.Configuration.GetConfigs();
        builder.Services.AddControllers();

        // Configure cors if provided
        if (corsPolicyOptions != null)
        {
            builder.Services.AddCors(options =>
            {
                foreach (var policy in corsPolicyOptions.Policies)
                {
                    options.AddPolicy(policy.Name, p =>
                    {
                        if (policy.AllowedOrigins.Any())
                            p.WithOrigins([.. policy.AllowedOrigins]);

                        if (policy.AllowAnyHeader)
                            p.AllowAnyHeader();

                        if (policy.AllowAnyMethod)
                            p.AllowAnyMethod();

                        if (policy.AllowAnyMethod)
                            p.AllowCredentials();
                    });
                }
            });
        }

        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();
        builder.Services.AddServices(builder.Configuration, true);

        if (migrate && mongoDbOptions != null)
        {
            Console.WriteLine($"Migrating MongoDB migrations");
            MigrationRunner runner = new MigrationRunner(mongoDbOptions.ConnectionString);
            var task = runner
                .RegisterLocator(
                    new AssemblyMigrationLocator(
                        Assembly.GetExecutingAssembly().Location
                    )
                ).RunAsync();
            task.Wait();
            Console.WriteLine("Migration completed");
            return;
        }

        if (revert && mongoDbOptions != null && revertVersion != null)
        {   
            var versions = revertVersion.Split('_');
            var orderedVersions = versions
                .Select(d => SemVersion.Parse(d).ToVersion())
                .OrderByDescending(v => v)
                .ToList();
                
            MigrationRunner runner = new MigrationRunner(mongoDbOptions.ConnectionString);
            
            foreach (var version in orderedVersions)
            {
                Console.WriteLine($"Reverting MongoDB migrations to version {version}...");    
                try {
                    var task = runner
                    .RegisterLocator(
                        new AssemblyMigrationLocator(
                            Assembly.GetExecutingAssembly().Location
                        )
                    ).RevertAsync(version.ToString());
                    task.Wait();
                } catch (Exception ex)
                {
                    Console.WriteLine($"Failed to revert version {version}. Exception: {ex}");
                }
            }

            Console.WriteLine("Revert completed");
            return;
        }


        var app = builder.Build();

        // Configure the HTTP request pipeline.
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        // Run https redirection first if possible before checking cors
        app.UseHttpsRedirection();

        if (corsPolicyOptions != null)
        {
            app.UseCors(corsPolicyOptions.Use);
        }

        app.UseAuthorization();
        app.MapControllers();

        app.MapHub<SignalRHub>("/test");
        app.MapHub<LobbyHub>("/match");

        app.Run();
    }
}
