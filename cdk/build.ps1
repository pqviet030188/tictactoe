Set-Location ..\Frontend
npm run build

# Copy frontend build output to Backend/frontend-dist
Remove-Item ..\Backend\frontend-dist -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Recurse -Force dist ..\Backend\frontend-dist

Set-Location ..\Backend
docker build -t tictactoe-dev-backend-2 -f Dockerfile .

Set-Location ..\cdk