# PowerShell script to deploy TicTacToe to AWS
# Run this after CDK stacks are deployed

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBackend,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipFrontend
)

$ErrorActionPreference = "Stop"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "TicTacToe AWS Deployment Script" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Get stack outputs
function Get-StackOutput {
    param($StackName, $OutputKey)
    
    $output = aws cloudformation describe-stacks `
        --stack-name $StackName `
        --region $Region `
        --query "Stacks[0].Outputs[?OutputKey=='$OutputKey'].OutputValue" `
        --output text
    
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to get output '$OutputKey' from stack '$StackName'"
    }
    
    return $output
}

# Deploy Backend
if (-not $SkipBackend) {
    Write-Host "`n[1/4] Deploying Backend..." -ForegroundColor Yellow
    
    # Get ECR repository URI
    $ecrUri = Get-StackOutput -StackName "TicTacToeBackendStack" -OutputKey "EcrRepositoryUri"
    Write-Host "ECR Repository: $ecrUri" -ForegroundColor Green
    
    # Login to ECR
    Write-Host "Logging in to ECR..." -ForegroundColor Gray
    aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $ecrUri
    
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to login to ECR"
    }
    
    # Build Docker image
    Write-Host "Building backend Docker image..." -ForegroundColor Gray
    Push-Location ..\Backend
    docker build -t tictactoe-backend -f Tictactoe/Dockerfile .
    
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        throw "Failed to build Docker image"
    }
    Pop-Location
    
    # Tag and push image
    Write-Host "Pushing image to ECR..." -ForegroundColor Gray
    docker tag tictactoe-backend:latest ${ecrUri}:latest
    docker push ${ecrUri}:latest
    
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to push Docker image to ECR"
    }
    
    # Update ECS service
    Write-Host "Updating ECS service..." -ForegroundColor Gray
    $clusterName = Get-StackOutput -StackName "TicTacToeBackendStack" -OutputKey "EcsClusterName"
    $serviceName = Get-StackOutput -StackName "TicTacToeBackendStack" -OutputKey "EcsServiceName"
    
    aws ecs update-service `
        --cluster $clusterName `
        --service $serviceName `
        --force-new-deployment `
        --region $Region | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to update ECS service"
    }
    
    Write-Host "✓ Backend deployment initiated" -ForegroundColor Green
    Write-Host "  ECS will deploy new tasks with updated image" -ForegroundColor Gray
}

# Deploy Frontend
if (-not $SkipFrontend) {
    Write-Host "`n[2/4] Deploying Frontend..." -ForegroundColor Yellow
    
    # Get configuration
    $backendUrl = Get-StackOutput -StackName "TicTacToeBackendStack" -OutputKey "LoadBalancerUrl"
    $bucketName = Get-StackOutput -StackName "TicTacToeFrontendStack" -OutputKey "WebsiteBucketName"
    $distributionId = Get-StackOutput -StackName "TicTacToeFrontendStack" -OutputKey "DistributionId"
    
    Write-Host "Backend URL: $backendUrl" -ForegroundColor Green
    Write-Host "S3 Bucket: $bucketName" -ForegroundColor Green
    Write-Host "CloudFront Distribution: $distributionId" -ForegroundColor Green
    
    # Build frontend
    Write-Host "Building frontend..." -ForegroundColor Gray
    Push-Location ..\Frontend
    
    $env:VITE_API_URL = $backendUrl
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        throw "Failed to build frontend"
    }
    Pop-Location
    
    # Upload to S3
    Write-Host "Uploading to S3..." -ForegroundColor Gray
    aws s3 sync ..\Frontend\dist\ s3://${bucketName}/ --delete --region $Region
    
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to upload to S3"
    }
    
    # Invalidate CloudFront cache
    Write-Host "Invalidating CloudFront cache..." -ForegroundColor Gray
    $invalidation = aws cloudfront create-invalidation `
        --distribution-id $distributionId `
        --paths "/*" `
        --output json | ConvertFrom-Json
    
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to invalidate CloudFront cache"
    }
    
    Write-Host "✓ Frontend deployed successfully" -ForegroundColor Green
    Write-Host "  Invalidation ID: $($invalidation.Invalidation.Id)" -ForegroundColor Gray
}

# Display URLs
Write-Host "`n[3/4] Deployment Summary" -ForegroundColor Yellow

$backendUrl = Get-StackOutput -StackName "TicTacToeBackendStack" -OutputKey "LoadBalancerUrl"
$frontendUrl = Get-StackOutput -StackName "TicTacToeFrontendStack" -OutputKey "FrontendUrl"

Write-Host "Backend API: $backendUrl" -ForegroundColor Cyan
Write-Host "Frontend:    $frontendUrl" -ForegroundColor Cyan

# Wait for ECS deployment
if (-not $SkipBackend) {
    Write-Host "`n[4/4] Waiting for ECS deployment..." -ForegroundColor Yellow
    Write-Host "You can monitor deployment progress in AWS Console or using:" -ForegroundColor Gray
    Write-Host "  aws ecs describe-services --cluster $clusterName --services $serviceName --region $Region" -ForegroundColor Gray
    Write-Host "`nPress Ctrl+C to exit without waiting (deployment will continue in background)" -ForegroundColor Gray
    
    $maxWaitSeconds = 300
    $elapsedSeconds = 0
    
    while ($elapsedSeconds -lt $maxWaitSeconds) {
        Start-Sleep -Seconds 10
        $elapsedSeconds += 10
        
        $serviceStatus = aws ecs describe-services `
            --cluster $clusterName `
            --services $serviceName `
            --region $Region `
            --query 'services[0].deployments[0].rolloutState' `
            --output text
        
        Write-Host "  [$elapsedSeconds/$maxWaitSeconds s] Deployment status: $serviceStatus" -ForegroundColor Gray
        
        if ($serviceStatus -eq "COMPLETED") {
            Write-Host "✓ ECS deployment completed successfully" -ForegroundColor Green
            break
        }
        
        if ($serviceStatus -eq "FAILED") {
            Write-Host "✗ ECS deployment failed" -ForegroundColor Red
            Write-Host "Check logs: aws logs tail /ecs/TicTacToe-$Environment-backend --follow --region $Region" -ForegroundColor Gray
            exit 1
        }
    }
    
    if ($elapsedSeconds -ge $maxWaitSeconds) {
        Write-Host "⚠ Deployment still in progress after $maxWaitSeconds seconds" -ForegroundColor Yellow
        Write-Host "  Monitor progress: aws ecs describe-services --cluster $clusterName --services $serviceName --region $Region" -ForegroundColor Gray
    }
}

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Frontend: $frontendUrl" -ForegroundColor Cyan
Write-Host "Backend:  $backendUrl" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
