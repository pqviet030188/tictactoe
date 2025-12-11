# AWS CDK Deployment for TicTacToe

This directory contains AWS CDK infrastructure-as-code for deploying the TicTacToe application to AWS.

## Architecture Overview

The deployment consists of 4 CDK stacks:

1. **Network Stack** - VPC, subnets, NAT gateway, security groups
2. **Database Stack** - DocumentDB (MongoDB) and ElastiCache (Redis)
3. **Backend Stack** - ECS Fargate, Application Load Balancer, ECR
4. **Frontend Stack** - S3, CloudFront CDN

## Cost Optimization

The infrastructure is configured for **optimal cost with reasonable stability**:

### Monthly Cost Estimate (~$145-$165)

- **VPC NAT Gateway**: ~$33/month (single NAT gateway across AZs)
- **DocumentDB**: ~$50/month (1x db.t3.medium instance)
- **ElastiCache Redis**: ~$12/month (1x cache.t3.micro node)
- **ECS Fargate**: ~$30-40/month (2 tasks, 0.5 vCPU, 1GB RAM each)
- **Application Load Balancer**: ~$18/month
- **CloudFront**: ~$1-2/month (low traffic)
- **S3**: <$1/month
- **Data Transfer**: Variable

### Cost Reduction Options

1. **Disable NAT Gateway** (~$33/month savings)
   - Use VPC endpoints for AWS services
   - Limits outbound internet access from private subnets

2. **Reduce ECS tasks** (~$15/month savings)
   - Change `backendDesiredCount` to 1 (loses redundancy)

3. **Use smaller DocumentDB instance** (~$15/month savings)
   - Change to `db.t3.small` (but less stable under load)

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** configured with credentials
3. **Node.js** (v18 or later)
4. **Docker** installed (for building backend image)

```powershell
# Install AWS CDK globally
npm install -g aws-cdk

# Configure AWS credentials
aws configure
```

## Installation

```powershell
cd cdk
npm install
```

## Configuration

You can customize the deployment using CDK context parameters:

```powershell
# Deploy to dev environment (default)
cdk deploy --all

# Deploy to production environment
cdk deploy --all --context environment=prod

# Custom configuration
cdk deploy --all `
  --context environment=prod `
  --context minCapacity=2 `
  --context maxCapacity=10 `
  --context documentDbInstanceType=db.t3.large `
  --context redisNodeType=cache.t3.small
```

### Available Configuration Options

| Parameter | Default | Description |
|-----------|---------|-------------|
| `environment` | `dev` | Environment name (dev, staging, prod) |
| `domain` | - | Custom domain name for frontend |
| `certificateArn` | - | ACM certificate ARN for HTTPS |
| `enableAutoScaling` | `true` | Enable ECS auto-scaling |
| `minCapacity` | `1` | Minimum ECS tasks |
| `maxCapacity` | `4` | Maximum ECS tasks |
| `documentDbInstanceType` | `db.t3.medium` | DocumentDB instance type |
| `documentDbInstances` | `1` | Number of DocumentDB instances |
| `redisNodeType` | `cache.t3.micro` | Redis node type |
| `redisNumCacheNodes` | `1` | Number of Redis nodes |
| `backendCpu` | `512` | ECS task CPU units (512 = 0.5 vCPU) |
| `backendMemory` | `1024` | ECS task memory in MB |
| `backendDesiredCount` | `2` | Desired number of ECS tasks |

## Deployment Steps

### 1. Bootstrap CDK (First Time Only)

```powershell
cdk bootstrap aws://ACCOUNT-ID/REGION
```

### 2. Build and Push Backend Docker Image

```powershell
# Get ECR repository URI (after first synth)
cdk synth TicTacToeBackendStack

# Login to ECR
$ECR_URI = aws ecr describe-repositories --repository-names tictactoe-dev-backend --query 'repositories[0].repositoryUri' --output text
$REGION = "us-east-1"
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_URI

# Build and push backend image
cd ../Backend
docker build -t tictactoe-backend -f Tictactoe/Dockerfile .
docker tag tictactoe-backend:latest ${ECR_URI}:latest
docker push ${ECR_URI}:latest
```

### 3. Deploy Infrastructure

```powershell
cd ../cdk

# Deploy all stacks
cdk deploy --all --require-approval never

# Or deploy stacks individually
cdk deploy TicTacToeNetworkStack
cdk deploy TicTacToeDatabaseStack
cdk deploy TicTacToeBackendStack
cdk deploy TicTacToeFrontendStack
```

### 4. Build and Deploy Frontend

```powershell
# Get backend URL from CDK outputs
$BACKEND_URL = aws cloudformation describe-stacks --stack-name TicTacToeBackendStack --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerUrl`].OutputValue' --output text

# Build frontend with backend URL
cd ../Frontend
$env:VITE_API_URL = $BACKEND_URL
npm run build

# Upload to S3
$BUCKET_NAME = aws cloudformation describe-stacks --stack-name TicTacToeFrontendStack --query 'Stacks[0].Outputs[?OutputKey==`WebsiteBucketName`].OutputValue' --output text
aws s3 sync dist/ s3://${BUCKET_NAME}/ --delete

# Invalidate CloudFront cache
$DIST_ID = aws cloudformation describe-stacks --stack-name TicTacToeFrontendStack --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' --output text
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

## CDK Commands

```powershell
# List all stacks
cdk list

# Synthesize CloudFormation templates
cdk synth

# Show differences between deployed and local
cdk diff

# Deploy specific stack
cdk deploy TicTacToeBackendStack

# Destroy all resources (CAUTION!)
cdk destroy --all
```

## Stack Dependencies

Stacks must be deployed in order due to dependencies:

```
TicTacToeNetworkStack
    ↓
TicTacToeDatabaseStack
    ↓
TicTacToeBackendStack
    ↓
TicTacToeFrontendStack
```

## Outputs

After deployment, CDK provides important outputs:

- **VPC ID**: VPC identifier for network configuration
- **DocumentDB Endpoint**: MongoDB connection string
- **Redis Endpoint**: Redis connection string
- **Backend URL**: API endpoint (http://alb-dns-name)
- **Frontend URL**: CloudFront distribution URL (https://xyz.cloudfront.net)
- **Frontend Bucket**: S3 bucket name for deployments
- **ECR Repository URI**: Docker registry for backend images

## Updating the Application

### Update Backend

```powershell
# Build and push new image
cd Backend
docker build -t tictactoe-backend -f Tictactoe/Dockerfile .
docker tag tictactoe-backend:latest ${ECR_URI}:latest
docker push ${ECR_URI}:latest

# Force ECS to deploy new image
aws ecs update-service `
  --cluster TicTacToe-dev-cluster `
  --service TicTacToe-dev-backend-service `
  --force-new-deployment
```

### Update Frontend

```powershell
cd Frontend
npm run build
aws s3 sync dist/ s3://${BUCKET_NAME}/ --delete
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

## Monitoring

### CloudWatch Logs

```powershell
# View ECS task logs
aws logs tail /ecs/TicTacToe-dev-backend --follow

# View specific log stream
aws logs get-log-events --log-group-name /ecs/TicTacToe-dev-backend --log-stream-name <stream-name>
```

### ECS Service Status

```powershell
# Check service status
aws ecs describe-services `
  --cluster TicTacToe-dev-cluster `
  --services TicTacToe-dev-backend-service

# List running tasks
aws ecs list-tasks --cluster TicTacToe-dev-cluster --service-name TicTacToe-dev-backend-service
```

### Database Connections

```powershell
# DocumentDB connection (requires bastion host in VPC)
mongo --host <docdb-endpoint> --username <username> --password <password>

# Redis connection (requires bastion host in VPC)
redis-cli -h <redis-endpoint> -p 6379
```

## Troubleshooting

### ECS Tasks Failing to Start

1. Check CloudWatch logs: `/ecs/TicTacToe-dev-backend`
2. Verify environment variables and secrets
3. Ensure security groups allow communication
4. Check task role permissions

### Backend Not Reachable

1. Verify ALB target group health checks
2. Check security group rules (ALB → ECS)
3. Ensure tasks are in RUNNING state
4. Test ALB endpoint directly: `curl http://<alb-dns>/health`

### Frontend Not Loading

1. Check S3 bucket has files: `aws s3 ls s3://${BUCKET_NAME}/`
2. Verify CloudFront distribution is deployed
3. Check browser console for CORS errors
4. Invalidate CloudFront cache

### Database Connection Issues

1. Verify security groups allow ECS → Database traffic
2. Check DocumentDB/Redis endpoints are correct in environment variables
3. Ensure secrets are properly configured
4. Test from ECS task using AWS Systems Manager Session Manager

## Security Best Practices

1. **Enable TLS for DocumentDB** (currently disabled for simplicity)
2. **Use HTTPS with ACM certificate** for ALB and CloudFront
3. **Enable VPC Flow Logs** for network monitoring
4. **Rotate secrets regularly** using Secrets Manager rotation
5. **Use IAM roles** instead of hardcoded credentials
6. **Enable CloudTrail** for audit logging
7. **Configure backup retention** for databases

## Cost Monitoring

```powershell
# View cost by service
aws ce get-cost-and-usage `
  --time-period Start=2025-12-01,End=2025-12-31 `
  --granularity MONTHLY `
  --metrics UnblendedCost `
  --group-by Type=DIMENSION,Key=SERVICE

# Set up billing alerts in AWS Console → Billing → Budgets
```

## Cleanup

To avoid ongoing charges, destroy all resources:

```powershell
# Delete all stacks
cdk destroy --all

# Manually delete ECR images (if repository is retained)
aws ecr batch-delete-image `
  --repository-name tictactoe-dev-backend `
  --image-ids imageTag=latest

# Empty and delete S3 buckets if retained
aws s3 rm s3://${BUCKET_NAME} --recursive
```

## CI/CD Integration

For automated deployments, see `.github/workflows/` (to be created separately). The workflow should:

1. Build backend Docker image
2. Push to ECR
3. Update ECS service
4. Build frontend
5. Deploy to S3
6. Invalidate CloudFront cache

## Support

For issues or questions:
- Check CloudWatch logs first
- Review AWS service quotas
- Consult AWS documentation
- Use CDK GitHub issues for CDK-specific problems
