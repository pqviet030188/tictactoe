import { App } from "aws-cdk-lib";
import { specifications } from "./specifications";
import "dotenv/config";

export const projectTemplate = (app: App) => ({
  account: (process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID) as string,
  region:
    (process.env.CDK_DEFAULT_REGION ||
    process.env.AWS_REGION ||
    specifications.defaults.region) as string,
  projectName: specifications.defaults.projectName,

  environment:
    (app.node.tryGetContext("environment") ||
    specifications.defaults.environment) as string,
  domain: app.node.tryGetContext("domain") as string,
  certificateArn: app.node.tryGetContext("certificateArn") as string,

  // Cost optimization specifications
  // no value means enabling auto scaling
  enableAutoScaling: (app.node.tryGetContext("enableAutoScaling") !== "false") as boolean,
  minCapacity: parseInt(
    app.node.tryGetContext("minCapacity") ||
      String(specifications.backend.autoScaling.defaultMinCapacity)
  ),
  maxCapacity: parseInt(
    app.node.tryGetContext("maxCapacity") ||
      String(specifications.backend.autoScaling.defaultMaxCapacity)
  ),

  // Database specifications
  // documentDbInstanceType:
  //   app.node.tryGetContext("documentDbInstanceType") ||
  //   specifications.database.documentDb.defaultInstanceType,
  // documentDbInstances: parseInt(
  //   app.node.tryGetContext("documentDbInstances") ||
  //     String(specifications.database.documentDb.defaultInstances)
  // ),

  // Redis specifications
  // redisNodeType:
  //   app.node.tryGetContext("redisNodeType") ||
  //   specifications.database.redis.defaultNodeType,
  // redisNumCacheNodes: parseInt(
  //   app.node.tryGetContext("redisNumCacheNodes") ||
  //     String(specifications.database.redis.defaultNumNodes)
  // ),

  // Backend specifications
  backendCpu: parseInt(
    app.node.tryGetContext("backendCpu") ||
      String(specifications.backend.defaultCpu)
  ),
  backendMemory: parseInt(
    app.node.tryGetContext("backendMemory") ||
      String(specifications.backend.defaultMemory)
  ),
  backendDesiredCount: parseInt(
    app.node.tryGetContext("backendDesiredCount") ||
      String(specifications.backend.defaultDesiredCount)
  ),
});
