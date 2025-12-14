#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { TicTacToeNetworkStack } from './lib/network-stack';
import { TicTacToeDatabaseStack } from './lib/database-stack';
import { TicTacToeBackendStack } from './lib/backend-stack';
import { TicTacToeFrontendStack } from './lib/frontend-stack';
import { getResourcePrefix, specifications } from './settings';

console.log('Creating CDK app...');
const app = new cdk.App();

const config = {
  projectName: 'TicTacToe',
  environment: 'dev',
  documentDbInstanceType: specifications.database.documentDb.defaultInstanceType,
  documentDbInstances: 1,
  redisNodeType: specifications.database.redis.defaultNodeType,
  redisNumCacheNodes: 1,
  backendCpu: 256,
  backendMemory: 512,
  backendDesiredCount: 1,
  enableAutoScaling: true,
  minCapacity: 1,
  maxCapacity: 3,
};

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT as string,
  region: 'ap-southeast-2',
};

console.log('Creating network stack...');
const networkStack = new TicTacToeNetworkStack(app, `${getResourcePrefix(config.projectName, config.environment)}-Network`, {
  env,
  config,
});

console.log('Creating database stack...');
const databaseStack = new TicTacToeDatabaseStack(app, `${getResourcePrefix(config.projectName, config.environment)}-Database`, {
  env,
  vpc: networkStack.vpc,
  config,
});

console.log('Creating backend stack...');
// const backendStack = new TicTacToeBackendStack(app, `${getResourcePrefix(config.projectName, config.environment)}-Backend`, {
//   env,
//   vpc: networkStack.vpc,
//   config,
  
// });

// console.log('Creating frontend stack...');
// const frontendStack = new TicTacToeFrontendStack(app, `${getResourcePrefix(config.projectName, config.environment)}-Frontend`, {
//   env,
//   backendUrl: backendStack.loadBalancerUrl,
//   config,
// });

// console.log('Synthesizing...');
// const assembly = app.synth();

// console.log(`Success! Generated ${assembly.stacks.length} stack(s)`);
// assembly.stacks.forEach(stack => {
//   console.log(`  - ${stack.stackName}`);
// });
