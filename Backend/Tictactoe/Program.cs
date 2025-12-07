using Tictactoe.Services;
using Tictactoe.Configurations;
using Tictactoe.Hubs;
using CSharp.Mongo.Migration.Core;
using CSharp.Mongo.Migration.Core.Locators;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using System.Text;
using Tictactoe.Types.Options;
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
        builder.Services.AddControllers(options =>
        {
            options.ModelValidatorProviders.Clear();
        })
        .ConfigureApiBehaviorOptions(options =>
        {
            options.InvalidModelStateResponseFactory = context =>
            {
                var errors = context.ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .Select(x => new
                    {
                        field = x.Key,
                        message = string.Join("; ", x.Value?.Errors.Select(e => e.ErrorMessage) ?? [])
                    });

                return new BadRequestObjectResult(new
                {
                    message = "Validation failed",
                    errors = errors
                });
            };
        });
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
        builder.Services.AddServices(builder.Configuration);

        // Configure JWT authentication if Jwt config exists
        var jwtSection = builder.Configuration.GetSection(JwtOptions.OptionSection);
        var jwtOptions = jwtSection.Get<JwtOptions>();
        if (jwtOptions != null)
        {
            var key = Encoding.UTF8.GetBytes(jwtOptions.Key);
            builder.Services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.RequireHttpsMetadata = false;
                options.SaveToken = true;
                options.TokenValidationParameters = TokenService.GetTokenValidationParameters(jwtOptions);
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var authHeader = context.Request.Headers["Authorization"].ToString();
                        if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
                        {
                            context.Token = authHeader.Substring("Bearer ".Length).Trim();
                            return Task.CompletedTask;
                        }

                        if (context.Request.Cookies.TryGetValue("x-access-token", out var cookieToken))
                        {
                            context.Token = cookieToken;
                            return Task.CompletedTask;
                        }
                     
                        return Task.CompletedTask;
                    }
                };
            });
        }

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

        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();

        app.MapHub<SignalRHub>("/test");
        app.MapHub<LobbyHub>("/lobby");
        app.MapHub<RoomHub>("/room");

        app.Run();
    }
}
