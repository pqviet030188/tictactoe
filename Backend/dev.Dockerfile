FROM mcr.microsoft.com/dotnet/sdk:8.0 AS dev
WORKDIR /app
COPY *.sln ./
COPY Tictactoe/*.csproj ./Tictactoe/
COPY TictactoeTest/*.csproj ./TictactoeTest/
RUN dotnet restore
COPY . .
COPY watch.ps1 .
EXPOSE 5000
CMD ["pwsh", "-File", "./watch.ps1"]