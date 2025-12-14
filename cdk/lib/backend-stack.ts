import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as logs from "aws-cdk-lib/aws-logs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
// import * as docdb from 'aws-cdk-lib/aws-docdb';
// import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import { Construct } from "constructs";
import {
  specifications,
  getLogRetention,
  isProductionEnvironment,
  getResourcePrefix,
} from "../settings";
import { envVariables } from "../settings";

export interface TicTacToeBackendStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  ecrRepository: ecr.Repository;
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

  constructor(scope: Construct, id: string, props: TicTacToeBackendStackProps) {
    super(scope, id, props);

    const {
      vpc,
      ecrRepository,
      // documentDbCluster, redisCluster,
      config,
    } = props;
    const prefix = getResourcePrefix(config.projectName, config.environment);

    // Import security groups from network stack
    const albSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      "ImportedAlbSg",
      cdk.Fn.importValue(`${prefix}-alb-sg-id`)
    );

    const ecsSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      "ImportedEcsSg",
      cdk.Fn.importValue(`${prefix}-ecs-sg-id`)
    );

    // ECR repository is passed in from ECR stack

    // ============================================
    // ECS Cluster
    // ============================================

    this.ecsCluster = new ecs.Cluster(this, "EcsCluster", {
      clusterName: `${prefix}-cluster`,
      vpc,
    });

    // ============================================
    // Application Load Balancer
    // ============================================

    const alb = new elbv2.ApplicationLoadBalancer(
      this,
      "ApplicationLoadBalancer",
      {
        vpc,
        internetFacing: true,
        loadBalancerName: `${prefix}-alb`,
        securityGroup: albSecurityGroup,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PUBLIC,
        },
      }
    );

    this.loadBalancerUrl = `http://${alb.loadBalancerDnsName}`;

    // ============================================
    // JWT Secret
    // ============================================

    const jwtSecret = new secretsmanager.Secret(this, "JwtSecret", {
      secretName: `${prefix}-jwt-secret`,
      description: "JWT signing key for authentication",
      generateSecretString: {
        excludePunctuation: true,
        includeSpace: false,
        passwordLength: specifications.jwt.secretLength,
      },
    });

    // ============================================
    // ECS Task Definition
    // ============================================

    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      "TaskDefinition",
      {
        family: `${prefix}-backend`,
        cpu: config.backendCpu, // 512 = 0.5 vCPU
        memoryLimitMiB: config.backendMemory, // 1024 = 1 GB
        runtimePlatform: {
          cpuArchitecture: ecs.CpuArchitecture.X86_64,
          operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        },
      }
    );

    // Import DocumentDB secret
    // const documentDbSecret = secretsmanager.Secret.fromSecretCompleteArn(
    //   this,
    //   'ImportedDocDbSecret',
    //   cdk.Fn.importValue(`${prefix}-docdb-secret-arn`)
    // );

    // CloudWatch log group
    const logGroup = new logs.LogGroup(this, "LogGroup", {
      logGroupName: `/ecs/${prefix}-backend`,
      retention: getLogRetention(config.environment),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Add container to task definition
    const container = taskDefinition.addContainer("BackendContainer", {
      containerName: "backend",
      image: ecs.ContainerImage.fromEcrRepository(ecrRepository, "latest"),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "backend",
        logGroup,
      }),
      environment: envVariables(config.environment).backend,
      secrets: {
        // JWT signing key from AWS Secrets Manager
        Jwt__Key: ecs.Secret.fromSecretsManager(jwtSecret),
      },
      portMappings: [
        {
          containerPort: specifications.backend.port,
          hostPort: specifications.backend.port,
          protocol: ecs.Protocol.TCP,
        },
        {
          containerPort: specifications.ecsFrontend.port,
          hostPort: specifications.ecsFrontend.port,
          protocol: ecs.Protocol.TCP,
        },
      ],
      healthCheck: {
        command: [
          "CMD-SHELL",
          `curl -f http://localhost:${specifications.backend.port}${specifications.backend.healthCheck.path} || exit 1`,
        ],
        interval: specifications.backend.healthCheck.interval,
        timeout: specifications.backend.healthCheck.timeout,
        retries: specifications.backend.healthCheck.unhealthyThresholdCount,
        startPeriod: specifications.backend.healthCheck.startPeriod,
      },
    });

    // Grant task role access to secrets
    // documentDbSecret.grantRead(taskDefinition.taskRole);
    jwtSecret.grantRead(taskDefinition.taskRole);

    // ============================================
    // ECS Fargate Service
    // ============================================

    const service = new ecs.FargateService(this, "FargateService", {
      cluster: this.ecsCluster,
      taskDefinition,
      serviceName: `${prefix}-backend-service`,
      desiredCount: config.backendDesiredCount,
      securityGroups: [ecsSecurityGroup],
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      assignPublicIp: false,
      healthCheckGracePeriod:
        specifications.backend.loadBalancer.healthCheckGracePeriod,
      minHealthyPercent: specifications.backend.loadBalancer.minHealthyPercent,
      maxHealthyPercent: specifications.backend.loadBalancer.maxHealthyPercent,
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

      scaling.scaleOnCpuUtilization("CpuScaling", {
        targetUtilizationPercent:
          specifications.backend.autoScaling.cpu.targetUtilization,
        scaleInCooldown: specifications.backend.autoScaling.cpu.scaleInCooldown,
        scaleOutCooldown:
          specifications.backend.autoScaling.cpu.scaleOutCooldown,
      });

      scaling.scaleOnMemoryUtilization("MemoryScaling", {
        targetUtilizationPercent:
          specifications.backend.autoScaling.memory.targetUtilization,
        scaleInCooldown:
          specifications.backend.autoScaling.memory.scaleInCooldown,
        scaleOutCooldown:
          specifications.backend.autoScaling.memory.scaleOutCooldown,
      });
    }

    // ============================================
    // Load Balancer Target Group
    // ============================================

    const backendTargetGroup = new elbv2.ApplicationTargetGroup(
      this,
      "BackendTargetGroup",
      {
        vpc,
        targetGroupName: `${prefix}-tg`,
        port: specifications.backend.port,
        protocol: elbv2.ApplicationProtocol.HTTP,
        targetType: elbv2.TargetType.IP,
        healthCheck: {
          path: specifications.backend.healthCheck.path,
          interval: specifications.backend.healthCheck.interval,
          timeout: specifications.backend.healthCheck.timeout,
          healthyThresholdCount:
            specifications.backend.healthCheck.healthyThresholdCount,
          unhealthyThresholdCount:
            specifications.backend.healthCheck.unhealthyThresholdCount,
        },
        deregistrationDelay:
          specifications.backend.loadBalancer.deregistrationDelay,
      }
    );

    service
      .loadBalancerTarget({
        containerName: container.containerName,
        containerPort: specifications.backend.port,
      })
      .attachToApplicationTargetGroup(backendTargetGroup);

    // ============================================
    // Frontend Target Group (for static site or ECS frontend)
    // ============================================
    const frontendTargetGroup = new elbv2.ApplicationTargetGroup(
      this,
      "FrontendTargetGroup",
      {
        vpc,
        targetGroupName: `${prefix}-frontend-tg`,
        port: specifications.ecsFrontend.port, // If using ECS for frontend, set correct port
        protocol: elbv2.ApplicationProtocol.HTTP,
        targetType: elbv2.TargetType.IP,
        healthCheck: {
          // enabled: true,
          path: "/", // Health check for static site or frontend service
          interval: cdk.Duration.seconds(30),
          timeout: cdk.Duration.seconds(5),
          healthyThresholdCount: 2,
          unhealthyThresholdCount: 2,
        },
        deregistrationDelay: cdk.Duration.seconds(10),
      }
    );

    service
      .loadBalancerTarget({
        containerName: container.containerName,
        containerPort: specifications.ecsFrontend.port,
      })
      .attachToApplicationTargetGroup(frontendTargetGroup);

    // Attach frontend target group to the correct container port (8080) -- handled by LoadBalancers override below

    // TODO: Attach your frontend ECS service to frontendTargetGroup here if using ECS for frontend
    // frontendService.attachToApplicationTargetGroup(frontendTargetGroup);

    // ============================================
    // Load Balancer Listener
    // ============================================

    // ============================================
    // Load Balancer Listener with Path-based Routing
    // ============================================
    const listener = alb.addListener("HttpListener", {
      port: specifications.network.ports.http,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultAction: elbv2.ListenerAction.forward([frontendTargetGroup]), // Default: serve frontend
    });

    
    // /api/* routes to backend
    listener.addTargetGroups("LBackendTargetGroup", {
      priority: 10,
      conditions: [elbv2.ListenerCondition.pathPatterns(["/api/*"])],
      targetGroups: [backendTargetGroup],
    });

    //     new elbv2.CfnListenerRule(this, "LBackendTargetGroupWithRewrite", {
    //   listenerArn: listener.listenerArn,
    //   priority: 10,

    //   conditions: [
    //     {
    //       field: "path-pattern",
    //       pathPatternConfig: {
    //         values: ["/api/*"]
    //       }
    //     }
    //   ],

    //   actions: [
    //     // // 1️⃣ Rewrite action (strip /api)
    //     // {
    //     //   type: "Rewrite",
    //     //   order: 1,
    //     //   // rewri
    //     // },

    //     // // 2️⃣ Forward action (send to your target group)
    //     // {
    //     //   type: "forward",
    //     //   order: 2,
    //     //   forwardConfig: {
    //     //     targetGroups: [
    //     //       {
    //     //         targetGroupArn: backendTargetGroup.targetGroupArn,
    //     //         weight: 1
    //     //       }
    //     //     ]
    //     //   }
    //     // }
    //     {
    //       type: " "
    //     }
    //   ]
    // });
    // listener.addTargets("", {
    //   conditions: [elbv2.ListenerCondition.pathPatterns(["/api/*"])],
    //   port: 80,
    //   priority: 10,
    //   targets: [service.loadBalancerTarget({
    //     containerName: "backend",
    //     containerPort: specifications.backend.port,
    //   })],
    // })

    //   service.registerLoadBalancerTargets({
    //   containerName: "",
    //   listener: ecs.ListenerConfig.applicationListener(listener, {
    //   protocol: elbv2.ApplicationProtocol.HTTPS
    // }),
    //   newTargetGroupId: "",
    //   containerPort: 0,
    //   protocol: ecs.Protocol.TCP,
    // })

    // listener.addTargets("ApiRoute", {
    //   priority: 10,
    //   conditions: [elbv2.ListenerCondition.pathPatterns(["/api/*"])],
    //   targets: [service],

    //   port: specifications.backend.port,
    //   healthCheck: {
    //     path: specifications.backend.healthCheck.path,
    //     interval: specifications.backend.healthCheck.interval,
    //     timeout: specifications.backend.healthCheck.timeout,
    //     healthyThresholdCount: specifications.backend.healthCheck.healthyThresholdCount,
    //     unhealthyThresholdCount: specifications.backend.healthCheck.unhealthyThresholdCount,
    //   },
    // });

    // listener.addTargets('FrontendRoute', {
    //   priority: 20,
    //   conditions: [elbv2.ListenerCondition.pathPatterns(['/*'])],
    //   port: 80, // Specify the container port for frontend
    //   targets: [service],
    // });

    listener.addTargetGroups("LFrontendTargetGroup", {
      priority: 20,
      conditions: [elbv2.ListenerCondition.pathPatterns(["/*"])],
      targetGroups: [frontendTargetGroup],
    });

    // /* (all other routes) go to frontend (already default)
    // Optionally, you can add more specific rules for static assets if needed

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

    new cdk.CfnOutput(this, "LoadBalancerDnsName", {
      value: alb.loadBalancerDnsName,
      description: "Application Load Balancer DNS name",
      exportName: `${prefix}-alb-dns`,
    });

    new cdk.CfnOutput(this, "LoadBalancerUrl", {
      value: this.loadBalancerUrl,
      description: "Backend API URL",
      exportName: `${prefix}-backend-url`,
    });

    // ECR outputs are already exported by the ECR stack

    new cdk.CfnOutput(this, "EcsClusterName", {
      value: this.ecsCluster.clusterName,
      description: "ECS cluster name",
      exportName: `${prefix}-ecs-cluster`,
    });

    new cdk.CfnOutput(this, "EcsServiceName", {
      value: service.serviceName,
      description: "ECS service name",
      exportName: `${prefix}-ecs-service`,
    });

    // Tags
    cdk.Tags.of(this.ecsCluster).add("Name", `${prefix}-cluster`);
    cdk.Tags.of(alb).add("Name", `${prefix}-alb`);
  }
}
