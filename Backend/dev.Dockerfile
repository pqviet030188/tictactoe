FROM mcr.microsoft.com/dotnet/sdk:8.0 AS dev
WORKDIR /app

# Set permissions for the app directory
RUN mkdir -p /app && chmod -R 777 /app

COPY *.sln ./
COPY Tictactoe/*.csproj ./Tictactoe/
COPY TictactoeTest/*.csproj ./TictactoeTest/
RUN dotnet restore
COPY . .
COPY watch.ps1 .
EXPOSE 5000
CMD ["pwsh", "-File", "./watch.ps1"]