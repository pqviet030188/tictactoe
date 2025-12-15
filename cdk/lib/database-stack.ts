import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as docdb from 'aws-cdk-lib/aws-docdb';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { specifications, getBackupRetention, isProductionEnvironment, getResourcePrefix } from '../settings';

export interface TicTacToeDatabaseStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  config: {
    projectName: string;
    environment: string;
    documentDbInstanceType: string;
    documentDbInstances: number;
    redisNodeType: string;
    redisNumCacheNodes: number;
  };
}

export class TicTacToeDatabaseStack extends cdk.Stack {
  public readonly documentDbCluster: docdb.DatabaseCluster;
  public readonly redisCluster: elasticache.CfnCacheCluster;
  public readonly documentDbEndpoint: string;
  public readonly redisEndpoint: string;
  public readonly documentDbSecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: TicTacToeDatabaseStackProps) {
    super(scope, id, props);

    const { vpc, config } = props;
    const prefix = getResourcePrefix(config.projectName, config.environment);

    // Import security groups
    const documentDbSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'ImportedDocDbSg',
      cdk.Fn.importValue(`${prefix}-docdb-sg-id`)
    );

    const redisSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'ImportedRedisSg',
      cdk.Fn.importValue(`${prefix}-redis-sg-id`)
    );

    // Create DocumentDB master credentials secret
    this.documentDbSecret = new secretsmanager.Secret(this, 'DocumentDbSecret', {
      secretName: `${prefix}-docdb-credentials`,
      description: 'DocumentDB master user credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'docdbadmin' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        includeSpace: false,
        passwordLength: 32,
      },
    });

    // Create subnet group for DocumentDB
    const documentDbSubnetGroup = new docdb.CfnDBSubnetGroup(this, 'DocumentDbSubnetGroup', {
      dbSubnetGroupName: `${config.projectName.toLowerCase()}-${config.environment}-docdb-subnet`,
      dbSubnetGroupDescription: 'Subnet group for DocumentDB cluster',
      subnetIds: vpc.isolatedSubnets.map(subnet => subnet.subnetId),
    });

    // Create DocumentDB parameter group
    const documentDbParameterGroup = new docdb.CfnDBClusterParameterGroup(this, 'DocumentDbParameterGroup', {
      family: specifications.database.documentDb.parameterGroupFamily,
      description: 'Parameter group for DocumentDB cluster',
      name: `${config.projectName.toLowerCase()}-${config.environment}-docdb-params`,
      parameters: {
        tls: 'disabled', // Disable TLS for simplicity (enable in production!)
        ttl_monitor: 'enabled',
      },
    });

    // Create DocumentDB cluster
    // Cost optimization: Single instance, smallest instance type
    this.documentDbCluster = new docdb.DatabaseCluster(this, 'DocumentDbCluster', {
      masterUser: {
        username: this.documentDbSecret.secretValueFromJson('username').unsafeUnwrap(),
        password: this.documentDbSecret.secretValueFromJson('password'),
      },
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MEDIUM
      ),
      instances: config.documentDbInstances, // Start with 1 instance (~$50/month)
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroup: documentDbSecurityGroup,
      dbClusterName: `${config.projectName.toLowerCase()}-${config.environment}-docdb`,
      port: specifications.database.documentDb.port,
      removalPolicy: isProductionEnvironment(config.environment) ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      backup: {
        retention: getBackupRetention(config.environment),
        preferredWindow: specifications.database.documentDb.backupWindow,
      },
      preferredMaintenanceWindow: specifications.database.documentDb.maintenanceWindow,
      parameterGroup: docdb.ClusterParameterGroup.fromParameterGroupName(
        this,
        'ImportedDocDbParamGroup',
        documentDbParameterGroup.name!
      ),
    });

    this.documentDbEndpoint = this.documentDbCluster.clusterEndpoint.socketAddress;

    // Create subnet group for Redis
    const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      cacheSubnetGroupName: `${config.projectName.toLowerCase()}-${config.environment}-redis-subnet`,
      description: 'Subnet group for Redis cluster',
      subnetIds: vpc.isolatedSubnets.map(subnet => subnet.subnetId),
    });

    // Create parameter group for Redis
    const redisParameterGroup = new elasticache.CfnParameterGroup(this, 'RedisParameterGroup', {
      cacheParameterGroupFamily: specifications.database.redis.parameterGroupFamily,
      description: 'Parameter group for Redis',
      properties: {
        'maxmemory-policy': specifications.database.redis.maxMemoryPolicy,
      },
    });

    // Create Redis cluster
    // Cost optimization: Single node, smallest node type
    this.redisCluster = new elasticache.CfnCacheCluster(this, 'RedisCluster', {
      cacheNodeType: config.redisNodeType, // cache.t3.micro (~$12/month)
      engine: 'redis',
      numCacheNodes: config.redisNumCacheNodes, // Single node for cost savings
      clusterName: `${config.projectName.toLowerCase()}-${config.environment}-redis`,
      vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
      cacheSubnetGroupName: redisSubnetGroup.cacheSubnetGroupName,
      cacheParameterGroupName: redisParameterGroup.ref,
      engineVersion: specifications.database.redis.engineVersion,
      port: specifications.database.redis.port,
      preferredMaintenanceWindow: specifications.database.redis.maintenanceWindow,
      snapshotRetentionLimit: isProductionEnvironment(config.environment) 
        ? specifications.database.redis.snapshotRetention.prod 
        : specifications.database.redis.snapshotRetention.default,
      snapshotWindow: specifications.database.redis.snapshotWindow,
      autoMinorVersionUpgrade: true,
    });

    this.redisEndpoint = this.redisCluster.attrRedisEndpointAddress;

    new cdk.CfnOutput(this, 'DocumentDbClusterEndpoint', {
      value: this.documentDbEndpoint,
      description: 'DocumentDB cluster endpoint',
      exportName: `${prefix}-docdb-endpoint`,
    });

    new cdk.CfnOutput(this, 'DocumentDbSecretArn', {
      value: this.documentDbSecret.secretArn,
      description: 'DocumentDB credentials secret ARN',
      exportName: `${prefix}-docdb-secret-arn`,
    });

    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: this.redisEndpoint,
      description: 'Redis cluster endpoint',
      exportName: `${prefix}-redis-endpoint`,
    });

    new cdk.CfnOutput(this, 'RedisPort', {
      value: this.redisCluster.attrRedisEndpointPort,
      description: 'Redis cluster port',
      exportName: `${prefix}-redis-port`,
    });

    // Tags
    cdk.Tags.of(this.documentDbCluster).add('Name', `${prefix}-docdb`);
    cdk.Tags.of(this.redisCluster).add('Name', `${prefix}-redis`);
  }
}
