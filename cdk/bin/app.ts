#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { TicTacToeNetworkStack } from '../lib/network-stack';
// import { TicTacToeDatabaseStack } from '../lib/database-stack';
import { TicTacToeBackendStack } from '../lib/backend-stack';
import { TicTacToeFrontendStack } from '../lib/frontend-stack';
import { getResourcePrefix, Settings } from '../lib/settings';

const app = new cdk.App();

// Configuration from context or environment variables
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
  region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || Settings.defaults.region,
};

const config = {
  projectName: Settings.defaults.projectName,
  environment: app.node.tryGetContext('environment') || Settings.defaults.environment,
  domain: app.node.tryGetContext('domain'), // Optional: your custom domain
  certificateArn: app.node.tryGetContext('certificateArn'), // Optional: ACM certificate ARN
  
  // Cost optimization settings
  enableAutoScaling: app.node.tryGetContext('enableAutoScaling') !== 'false',
  minCapacity: parseInt(app.node.tryGetContext('minCapacity') || String(Settings.backend.autoScaling.defaultMinCapacity)),
  maxCapacity: parseInt(app.node.tryGetContext('maxCapacity') || String(Settings.backend.autoScaling.defaultMaxCapacity)),
  
  // Database settings
  documentDbInstanceType: app.node.tryGetContext('documentDbInstanceType') || Settings.database.documentDb.defaultInstanceType,
  documentDbInstances: parseInt(app.node.tryGetContext('documentDbInstances') || String(Settings.database.documentDb.defaultInstances)),
  
  // Redis settings
  redisNodeType: app.node.tryGetContext('redisNodeType') || Settings.database.redis.defaultNodeType,
  redisNumCacheNodes: parseInt(app.node.tryGetContext('redisNumCacheNodes') || String(Settings.database.redis.defaultNumNodes)),
  
  // Backend settings
  backendCpu: parseInt(app.node.tryGetContext('backendCpu') || String(Settings.backend.defaultCpu)),
  backendMemory: parseInt(app.node.tryGetContext('backendMemory') || String(Settings.backend.defaultMemory)),
  backendDesiredCount: parseInt(app.node.tryGetContext('backendDesiredCount') || String(Settings.backend.defaultDesiredCount)),
};

// Stack 1: Network infrastructure (VPC, Subnets, NAT Gateway)
const networkStack = new TicTacToeNetworkStack(app, `${getResourcePrefix(config.projectName, config.environment)}-Network`, {
  env,
  description: 'Network infrastructure for TicTacToe application',
  tags: {
    Project: config.projectName,
    Environment: config.environment,
    ManagedBy: Settings.tags.managedBy,
  },
  config,
});

// Stack 2: Database infrastructure (DocumentDB, ElastiCache)
// const databaseStack = new TicTacToeDatabaseStack(app, `${getResourcePrefix(config.projectName, config.environment)}-Database`, {
//   env,
//   description: 'Database infrastructure for TicTacToe application',
//   tags: {
//     Project: config.projectName,
//     Environment: config.environment,
//     ManagedBy: Settings.tags.managedBy,
//   },
//   vpc: networkStack.vpc,
//   config,
// });
// databaseStack.addDependency(networkStack);

// Stack 3: Backend infrastructure (ECS Fargate, ALB)
const backendStack = new TicTacToeBackendStack(app, `${getResourcePrefix(config.projectName, config.environment)}-Backend`, {
  env,
  description: 'Backend infrastructure for TicTacToe application',
  tags: {
    Project: config.projectName,
    Environment: config.environment,
    ManagedBy: Settings.tags.managedBy,
  },
  vpc: networkStack.vpc,
  // documentDbCluster: databaseStack.documentDbCluster,
  // redisCluster: databaseStack.redisCluster,
  config,
});
// backendStack.addDependency(databaseStack);

// Stack 4: Frontend infrastructure (S3, CloudFront)
const frontendStack = new TicTacToeFrontendStack(app, `${getResourcePrefix(config.projectName, config.environment)}-Frontend`, {
  env,
  description: 'Frontend infrastructure for TicTacToe application',
  tags: {
    Project: config.projectName,
    Environment: config.environment,
    ManagedBy: Settings.tags.managedBy,
  },
  backendUrl: backendStack.loadBalancerUrl,
  config,
});
frontendStack.addDependency(backendStack);

app.synth();

