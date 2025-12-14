#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { TicTacToeNetworkStack } from '../lib/network-stack';
// import { TicTacToeDatabaseStack } from '../lib/database-stack';
import { TicTacToeEcrStack } from '../lib/ecr-stack';
import { TicTacToeBackendStack } from '../lib/backend-stack';
import { TicTacToeFrontendStack } from '../lib/frontend-stack';
import { getResourcePrefix, specifications } from '../settings';
import { projectTemplate } from '../settings';

const app = new cdk.App();

const appProjectTemplate = projectTemplate(app);
// Stack 1: Network infrastructure (VPC, Subnets, NAT Gateway)
const networkStack = new TicTacToeNetworkStack(app, `${getResourcePrefix(appProjectTemplate.projectName, appProjectTemplate.environment)}-Network`, {
   env: {
    account: appProjectTemplate.account,
    region: appProjectTemplate.region,
   }, 
  description: 'Network infrastructure for TicTacToe application',
  tags: {
    Project: appProjectTemplate.projectName,
    Environment: appProjectTemplate.environment,
    ManagedBy: specifications.tags.managedBy,
  },
  config: {
    environment: appProjectTemplate.environment,
    projectName: appProjectTemplate.projectName,
  },
});

// Stack 2: ECR Repository (must be created before backend stack)
const ecrStack = new TicTacToeEcrStack(app, `${getResourcePrefix(appProjectTemplate.projectName, appProjectTemplate.environment)}-ECR`, {
  env: {
    account: appProjectTemplate.account,
    region: appProjectTemplate.region,
   }, 
  description: 'ECR repository for TicTacToe backend Docker images',
  tags: {
    Project: appProjectTemplate.projectName,
    Environment: appProjectTemplate.environment,
    ManagedBy: specifications.tags.managedBy,
  },
  config: {
    environment: appProjectTemplate.environment,
    projectName: appProjectTemplate.projectName,
  },
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
const backendStack = new TicTacToeBackendStack(app, `${getResourcePrefix(appProjectTemplate.projectName, appProjectTemplate.environment)}-Backend`, {
  env: {
    account: appProjectTemplate.account,
    region: appProjectTemplate.region,
  },
  description: 'Backend infrastructure for TicTacToe application',
  tags: {
    Project: appProjectTemplate.projectName,
    Environment: appProjectTemplate.environment,
    ManagedBy: specifications.tags.managedBy,
  },
  vpc: networkStack.vpc,
  ecrRepository: ecrStack.ecrRepository,
  // documentDbCluster: databaseStack.documentDbCluster,
  // redisCluster: databaseStack.redisCluster,
  config: {
    environment: appProjectTemplate.environment,
    projectName: appProjectTemplate.projectName,
    backendCpu: appProjectTemplate.backendCpu,
    backendMemory: appProjectTemplate.backendMemory,
    backendDesiredCount: appProjectTemplate.backendDesiredCount,
    enableAutoScaling: appProjectTemplate.enableAutoScaling,
    minCapacity: appProjectTemplate.minCapacity,
    maxCapacity: appProjectTemplate.maxCapacity,
  }
});
backendStack.addDependency(ecrStack);
// backendStack.addDependency(databaseStack);

// Stack 4: Frontend infrastructure (S3, CloudFront)
const frontendStack = new TicTacToeFrontendStack(app, `${getResourcePrefix(appProjectTemplate.projectName, appProjectTemplate.environment)}-Frontend`, {
  env: {
    account: appProjectTemplate.account,
    region: appProjectTemplate.region,
  },
  description: 'Frontend infrastructure for TicTacToe application',
  tags: {
    Project: appProjectTemplate.projectName,
    Environment: appProjectTemplate.environment,
    ManagedBy: specifications.tags.managedBy,
  },
  backendUrl: backendStack.loadBalancerUrl,
  config: {
    environment: appProjectTemplate.environment,
    projectName: appProjectTemplate.projectName,
    certificateArn: appProjectTemplate.certificateArn,
    domain: appProjectTemplate.domain,
  },
});
frontendStack.addDependency(backendStack);

app.synth();

