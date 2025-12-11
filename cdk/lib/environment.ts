import { isProductionEnvironment, Settings } from "./settings";

export const getContainerEnvironment = (environment: string) => ({
  backend: {
    ASPNETCORE_ENVIRONMENT: isProductionEnvironment(environment)
      ? "Production"
      : "Development",
    ASPNETCORE_URLS: `http://+:${Settings.backend.port}`,

    // External database connections from .env file
    MongoDb__ConnectionString: process.env.MONGODB_CONNECTION_STRING || "",
    Redis__ConnectionString: process.env.REDIS_CONNECTION_STRING || "",

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
    CorsPolicies__Policies__0__AllowedOrigins__0: Settings.storefront.url,
    CorsPolicies__Policies__0__AllowAnyHeader: "true",
    CorsPolicies__Policies__0__AllowAnyMethod: "true",
    CorsPolicies__Policies__0__AllowCredentials: "true", // Required for SignalR with authentication
  },
  frontend: {
    
  }
});
