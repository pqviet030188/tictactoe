# Backend Dockerfile for AWS Deployment
# Multi-stage build optimized for production

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copy solution and project files
COPY Tictactoe.sln ./
COPY Tictactoe/Tictactoe.csproj ./Tictactoe/
COPY TictactoeTest/TictactoeTest.csproj ./TictactoeTest/

# Restore dependencies
RUN dotnet restore

# Copy source code
COPY . .

# Build and publish
WORKDIR /app/Tictactoe
RUN dotnet publish -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app

# Install curl for health checks AND ca-certificates for SSL/TLS
RUN apt-get update && \
    apt-get install -y curl ca-certificates && apt-get install -y nginx supervisor && \
    rm -rf /var/lib/apt/lists/*

# Update CA certificates - CRITICAL for MongoDB Atlas SSL
RUN update-ca-certificates

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy supervisor config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy published files
COPY --from=build /app/publish .

# Copy frontend build (assume built in Frontend/dist)
COPY ./frontend-dist /usr/share/nginx/html

# Create non-root user for security
# RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
# USER appuser
# chown -R appuser:appuser /var/lib/nginx

# Expose port
EXPOSE 8080 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Start application
#ENTRYPOINT ["dotnet", "Tictactoe.dll"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]