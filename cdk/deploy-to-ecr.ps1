# Build and push Docker image to AWS ECR
# Run this from the Backend directory

$REGION = "ap-southeast-2"
$ACCOUNT_ID = "703309995167"
$REPOSITORY = "tictactoe-dev-backend"
$IMAGE_TAG = "latest"
$ECR_STACK_NAME = "TicTacToe-dev-ECR"

Write-Host "Checking if ECR repository exists..." -ForegroundColor Cyan
Write-Host "Repository: $REPOSITORY in region $REGION" -ForegroundColor Cyan

# Deploy ECR stack if it doesn't exist
$stackExists = aws cloudformation describe-stacks --stack-name $ECR_STACK_NAME --region $REGION 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ECR stack not found. Deploying ECR stack..." -ForegroundColor Yellow
    npm install
    npm run deploy:ecr
    #npx cdk deploy $ECR_STACK_NAME --require-approval never --region $REGION
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to deploy ECR stack." -ForegroundColor Red
        #Set-Location ..\Backend
        exit 1
    }
    
    #Set-Location ..\Backend
    Write-Host "ECR stack deployed successfully." -ForegroundColor Green
} else {
    Write-Host "ECR repository already exists." -ForegroundColor Green
}

# Verify repository was created
Write-Host "Verifying ECR repository..." -ForegroundColor Cyan
$repoCheck = aws ecr describe-repositories --repository-names $REPOSITORY --region $REGION 2>$null   
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: ECR repository was not created by CDK stack!" -ForegroundColor Red
    Write-Host "Stack deployed but repository '$REPOSITORY' not found." -ForegroundColor Red
    exit 1
}
Write-Host "ECR repository verified successfully." -ForegroundColor Green

Write-Host "Authenticating with ECR..." -ForegroundColor Cyan
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ECR authentication failed. Make sure AWS CLI is configured." -ForegroundColor Red
    exit 1
}

Set-Location ..\Frontend
Write-Host "Building Frontend..." -ForegroundColor Cyan
npm run build

# Copy frontend build output to Backend/frontend-dist
Remove-Item ..\Backend\frontend-dist -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Recurse -Force dist ..\Backend\frontend-dist

Set-Location ..\Backend

Write-Host "Building Docker image..." -ForegroundColor Cyan
docker build -t $REPOSITORY -f Dockerfile .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker build failed." -ForegroundColor Red
    exit 1
}

Write-Host "Tagging image..." -ForegroundColor Cyan
docker tag "${REPOSITORY}:latest" "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/${REPOSITORY}:${IMAGE_TAG}"

Write-Host "Pushing to ECR..." -ForegroundColor Cyan
docker push "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/${REPOSITORY}:${IMAGE_TAG}"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Push to ECR failed." -ForegroundColor Red
    exit 1
}

Write-Host "Image successfully pushed to ECR!" -ForegroundColor Green
Write-Host "Repository: $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/${REPOSITORY}:${IMAGE_TAG}" -ForegroundColor Yellow
Set-Location ..\cdk