Start-Process -NoNewWindow -FilePath "dotnet" -ArgumentList "watch", "--project", "Tictactoe/Tictactoe.csproj", "run", "--urls", "http://0.0.0.0:5000"

Get-ChildItem -Recurse -Filter *.csproj |
    Where-Object { $_.FullName -notlike "*Tictactoe*" } |
    ForEach-Object {
        Start-Process -NoNewWindow -FilePath "dotnet" -ArgumentList "watch", "--project", $_.FullName, "build"
    }

while ($true) { Start-Sleep -Seconds 3600 }