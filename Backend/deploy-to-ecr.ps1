# Build and push Docker image to AWS ECR
# Run this from the Backend directory

$REGION = "ap-southeast-2"
$ACCOUNT_ID = "703309995167"
$REPOSITORY = "tictactoe-dev-backend"
$IMAGE_TAG = "latest"

Write-Host "Authenticating with ECR..." -ForegroundColor Cyan
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ECR authentication failed. Make sure AWS CLI is configured." -ForegroundColor Red
    exit 1
}

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
