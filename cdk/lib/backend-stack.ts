import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
// import * as docdb from 'aws-cdk-lib/aws-docdb';
// import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import { Construct } from 'constructs';
import { Settings, getLogRetention, isProductionEnvironment, getResourcePrefix } from './settings';
import { getContainerEnvironment } from './environment';

export interface TicTacToeBackendStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  // documentDbCluster: docdb.DatabaseCluster;
  // redisCluster: elasticache.CfnCacheCluster;
  config: {
    projectName: string;
    environment: string;
    backendCpu: number;
    backendMemory: number;
    backendDesiredCount: number;
    enableAutoScaling: boolean;
    minCapacity: number;
    maxCapacity: number;
  };
}

export class TicTacToeBackendStack extends cdk.Stack {
  public readonly loadBalancerUrl: string;
  public readonly ecsCluster: ecs.Cluster;
  public readonly ecrRepository: ecr.Repository;

  constructor(scope: Construct, id: string, props: TicTacToeBackendStackProps) {
    super(scope, id, props);

    const { vpc, 
      // documentDbCluster, redisCluster, 
    config } = props;
    const prefix = getResourcePrefix(config.projectName, config.environment);

    // Import security groups from network stack
    const albSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'ImportedAlbSg',
      cdk.Fn.importValue(`${prefix}-alb-sg-id`)
    );

    const ecsSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'ImportedEcsSg',
      cdk.Fn.importValue(`${prefix}-ecs-sg-id`)
    );

    // ============================================
    // ECR Repository for Backend Docker Image
    // ============================================

    this.ecrRepository = new ecr.Repository(this, 'BackendRepository', {
      repositoryName: `${config.projectName.toLowerCase()}-${config.environment}-backend`,
      removalPolicy: isProductionEnvironment(config.environment) ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: !isProductionEnvironment(config.environment),
      imageScanOnPush: Settings.backend.ecr.imageScanOnPush,
      lifecycleRules: [
        {
          description: 'Keep last 10 images',
          maxImageCount: Settings.backend.ecr.maxImageCount,
        },
      ],
    });

    // ============================================
    // ECS Cluster
    // ============================================

    this.ecsCluster = new ecs.Cluster(this, 'EcsCluster', {
      clusterName: `${prefix}-cluster`,
      vpc,
    });

    // ============================================
    // Application Load Balancer
    // ============================================

    const alb = new elbv2.ApplicationLoadBalancer(this, 'ApplicationLoadBalancer', {
      vpc,
      internetFacing: true,
      loadBalancerName: `${prefix}-alb`,
      securityGroup: albSecurityGroup,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });

    this.loadBalancerUrl = `http://${alb.loadBalancerDnsName}`;

    // ============================================
    // JWT Secret
    // ============================================

    const jwtSecret = new secretsmanager.Secret(this, 'JwtSecret', {
      secretName: `${prefix}-jwt-secret`,
      description: 'JWT signing key for authentication',
      generateSecretString: {
        excludePunctuation: true,
        includeSpace: false,
        passwordLength: Settings.jwt.secretLength,
      },
    });

    // ============================================
    // ECS Task Definition
    // ============================================

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      family: `${prefix}-backend`,
      cpu: config.backendCpu, // 512 = 0.5 vCPU
      memoryLimitMiB: config.backendMemory, // 1024 = 1 GB
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.X86_64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });

    // Import DocumentDB secret
    // const documentDbSecret = secretsmanager.Secret.fromSecretCompleteArn(
    //   this,
    //   'ImportedDocDbSecret',
    //   cdk.Fn.importValue(`${prefix}-docdb-secret-arn`)
    // );

    // CloudWatch log group
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/ecs/${prefix}-backend`,
      retention: getLogRetention(config.environment),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Add container to task definition
    const container = taskDefinition.addContainer('BackendContainer', {
      containerName: 'backend',
      image: ecs.ContainerImage.fromEcrRepository(this.ecrRepository, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'backend',
        logGroup,
      }),
      environment: getContainerEnvironment(config.environment).backend,
      secrets: {
        // JWT signing key from AWS Secrets Manager
        Jwt__Key: ecs.Secret.fromSecretsManager(jwtSecret),
      },
      portMappings: [
        {
          containerPort: Settings.backend.port,
          protocol: ecs.Protocol.TCP,
        },
      ],
      healthCheck: {
        command: ['CMD-SHELL', `curl -f http://localhost:${Settings.backend.port}${Settings.backend.healthCheck.path} || exit 1`],
        interval: Settings.backend.healthCheck.interval,
        timeout: Settings.backend.healthCheck.timeout,
        retries: Settings.backend.healthCheck.unhealthyThresholdCount,
        startPeriod: Settings.backend.healthCheck.startPeriod,
      },
    });

    // Grant task role access to secrets
    // documentDbSecret.grantRead(taskDefinition.taskRole);
    jwtSecret.grantRead(taskDefinition.taskRole);

    // ============================================
    // ECS Fargate Service
    // ============================================

    const service = new ecs.FargateService(this, 'FargateService', {
      cluster: this.ecsCluster,
      taskDefinition,
      serviceName: `${prefix}-backend-service`,
      desiredCount: config.backendDesiredCount,
      securityGroups: [ecsSecurityGroup],
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      assignPublicIp: false,
      healthCheckGracePeriod: Settings.backend.loadBalancer.healthCheckGracePeriod,
      minHealthyPercent: Settings.backend.loadBalancer.minHealthyPercent,
      maxHealthyPercent: Settings.backend.loadBalancer.maxHealthyPercent,
      circuitBreaker: {
        rollback: true,
      },
    });

    // Auto Scaling
    if (config.enableAutoScaling) {
      const scaling = service.autoScaleTaskCount({
        minCapacity: config.minCapacity,
        maxCapacity: config.maxCapacity,
      });

      scaling.scaleOnCpuUtilization('CpuScaling', {
        targetUtilizationPercent: Settings.backend.autoScaling.cpu.targetUtilization,
        scaleInCooldown: Settings.backend.autoScaling.cpu.scaleInCooldown,
        scaleOutCooldown: Settings.backend.autoScaling.cpu.scaleOutCooldown,
      });

      scaling.scaleOnMemoryUtilization('MemoryScaling', {
        targetUtilizationPercent: Settings.backend.autoScaling.memory.targetUtilization,
        scaleInCooldown: Settings.backend.autoScaling.memory.scaleInCooldown,
        scaleOutCooldown: Settings.backend.autoScaling.memory.scaleOutCooldown,
      });
    }

    // ============================================
    // Load Balancer Target Group
    // ============================================

    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      vpc,
      targetGroupName: `${prefix}-tg`,
      port: Settings.backend.port,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: Settings.backend.healthCheck.path,
        interval: Settings.backend.healthCheck.interval,
        timeout: Settings.backend.healthCheck.timeout,
        healthyThresholdCount: Settings.backend.healthCheck.healthyThresholdCount,
        unhealthyThresholdCount: Settings.backend.healthCheck.unhealthyThresholdCount,
      },
      deregistrationDelay: Settings.backend.loadBalancer.deregistrationDelay,
    });

    service.attachToApplicationTargetGroup(targetGroup);

    // ============================================
    // Load Balancer Listener
    // ============================================

    const listener = alb.addListener('HttpListener', {
      port: Settings.network.ports.http,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultAction: elbv2.ListenerAction.forward([targetGroup]),
    });

    // For HTTPS, uncomment and provide certificate ARN:
    /*
    const httpsListener = alb.addListener('HttpsListener', {
      port: 443,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      certificates: [
        elbv2.ListenerCertificate.fromArn('arn:aws:acm:region:account:certificate/certificate-id'),
      ],
      defaultAction: elbv2.ListenerAction.forward([targetGroup]),
    });

    // Redirect HTTP to HTTPS
    listener.addAction('RedirectToHttps', {
      action: elbv2.ListenerAction.redirect({
        protocol: 'HTTPS',
        port: '443',
        permanent: true,
      }),
    });
    */

    // ============================================
    // Outputs
    // ============================================

    new cdk.CfnOutput(this, 'LoadBalancerDnsName', {
      value: alb.loadBalancerDnsName,
      description: 'Application Load Balancer DNS name',
      exportName: `${prefix}-alb-dns`,
    });

    new cdk.CfnOutput(this, 'LoadBalancerUrl', {
      value: this.loadBalancerUrl,
      description: 'Backend API URL',
      exportName: `${prefix}-backend-url`,
    });

    new cdk.CfnOutput(this, 'EcrRepositoryUri', {
      value: this.ecrRepository.repositoryUri,
      description: 'ECR repository URI',
      exportName: `${prefix}-ecr-uri`,
    });

    new cdk.CfnOutput(this, 'EcsClusterName', {
      value: this.ecsCluster.clusterName,
      description: 'ECS cluster name',
      exportName: `${prefix}-ecs-cluster`,
    });

    new cdk.CfnOutput(this, 'EcsServiceName', {
      value: service.serviceName,
      description: 'ECS service name',
      exportName: `${prefix}-ecs-service`,
    });

    // Tags
    cdk.Tags.of(this.ecsCluster).add('Name', `${prefix}-cluster`);
    cdk.Tags.of(alb).add('Name', `${prefix}-alb`);
  }
}
