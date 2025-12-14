import { isProductionEnvironment, specifications } from "./specifications";

import "dotenv/config";

export const envVariables = (environment: string) => ({
  backend: {
    ASPNETCORE_ENVIRONMENT: process.env.ASPNETCORE_ENVIRONMENT || (
      isProductionEnvironment(environment)
        ? "Production"
        : "Development"),

    ASPNETCORE_URLS: process.env.ASPNETCORE_URLS || `http://+:${specifications.backend.port}`,

    // External database connections from .env file
    MongoDb__ConnectionString: process.env.MongoDb__ConnectionString || "",
    Redis__ConnectionString: process.env.Redis__ConnectionString || "",

    // JWT Configuration
    Jwt__Issuer: isProductionEnvironment(environment)
      ? "TictactoeIssuerProd"
      : "TictactoeIssuerDev",
    Jwt__Audience: isProductionEnvironment(environment)
      ? "TictactoeAudienceProd"
      : "TictactoeAudienceDev",
    Jwt__AccessTokenMinutes: "60",
    Jwt__RefreshTokenDays: "7",

    // CORS Configuration
    // For SignalR/WebSockets with credentials, you must specify exact origins (not \"*\")
    // Using environment variable to avoid circular dependency with frontend stack
    CorsPolicies__Use: "Default",
    CorsPolicies__Policies__0__Name: "Default",
    // CorsPolicies__Policies__0__AllowedOrigins__0: specifications.storefront.url,
    CorsPolicies__Policies__0__AllowAnyHeader: "true",
    CorsPolicies__Policies__0__AllowAnyMethod: "true",
    CorsPolicies__Policies__0__AllowCredentials: "true", // Required for SignalR with authentication
    Https_Enabled: process.env.Https_Enabled || "false",
    Https_RedirectToHttps: process.env.Https_RedirectToHttps || "false",
    Https_RequireHttpsMetadata: process.env.Https_RequireHttpsMetadata || "false",
  },
  frontend: {},
});
