import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { specifications, getResourcePrefix } from '../settings';

export interface TicTacToeNetworkStackProps extends cdk.StackProps {
  config: {
    projectName: string;
    environment: string;
  };
}

export class TicTacToeNetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props: TicTacToeNetworkStackProps) {
    super(scope, id, props);

    const { config } = props;
    const prefix = getResourcePrefix(config.projectName, config.environment);

    // Create VPC with public and private subnets
    // Cost optimization: Using NAT Gateway (1 instance) instead of NAT instance per AZ
    // For production with high availability, consider natGateways: 2
    this.vpc = new ec2.Vpc(this, 'TicTacToeVpc', {
      vpcName: `${prefix}-vpc`,
      maxAzs: specifications.network.maxAzs,
      natGateways: specifications.network.natGateways,
      // For even lower cost: natGateways: 0 and use VPC endpoints, but limits outbound internet
      
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: specifications.network.subnetCidrMask,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: specifications.network.subnetCidrMask,
        },
        {
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: specifications.network.subnetCidrMask,
        },
      ],
      
      // Enable DNS
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // VPC Flow Logs to S3 (optional, for security monitoring)
    // Commented out to reduce costs, uncomment for production
    /*
    const flowLogsBucket = new s3.Bucket(this, 'FlowLogsBucket', {
      bucketName: `${config.projectName.toLowerCase()}-${config.environment}-flowlogs-${cdk.Aws.ACCOUNT_ID}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(30),
        },
      ],
    });

    new ec2.FlowLog(this, 'VpcFlowLog', {
      resourceType: ec2.FlowLogResourceType.fromVpc(this.vpc),
      destination: ec2.FlowLogDestination.toS3(flowLogsBucket),
    });
    */

    // Security group for Application Load Balancer
    const albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: `${prefix}-alb-sg`,
      description: 'Security group for Application Load Balancer',
      allowAllOutbound: true,
    });

    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(specifications.network.ports.http),
      'Allow HTTP traffic from anywhere'
    );

    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(specifications.network.ports.https),
      'Allow HTTPS traffic from anywhere'
    );

    // Security group for ECS tasks
    const ecsSecurityGroup = new ec2.SecurityGroup(this, 'EcsSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: `${prefix}-ecs-sg`,
      description: 'Security group for ECS tasks',
      allowAllOutbound: true,
    });

    ecsSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(specifications.network.ports.backend),
      `Allow traffic from ALB to ECS tasks on port ${specifications.network.ports.backend}`
    );

    ecsSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(specifications.network.ports.frontend),
      `Allow traffic from ALB to ECS tasks on port ${specifications.network.ports.frontend}`
    );

    // Security group for DocumentDB
    // const documentDbSecurityGroup = new ec2.SecurityGroup(this, 'DocumentDbSecurityGroup', {
    //   vpc: this.vpc,
    //   securityGroupName: `${prefix}-docdb-sg`,
    //   description: 'Security group for DocumentDB',
    //   allowAllOutbound: false,
    // });

    // documentDbSecurityGroup.addIngressRule(
    //   ecsSecurityGroup,
    //   ec2.Port.tcp(specifications.network.ports.mongodb),
    //   'Allow MongoDB traffic from ECS tasks'
    // );

    // Security group for Redis
    // const redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
    //   vpc: this.vpc,
    //   securityGroupName: `${prefix}-redis-sg`,
    //   description: 'Security group for Redis',
    //   allowAllOutbound: false,
    // });

    // redisSecurityGroup.addIngressRule(
    //   ecsSecurityGroup,
    //   ec2.Port.tcp(specifications.network.ports.redis),
    //   'Allow Redis traffic from ECS tasks'
    // );

    // Export security groups for use in other stacks
    this.exportValue(albSecurityGroup.securityGroupId, {
      name: `${prefix}-alb-sg-id`,
    });

    this.exportValue(ecsSecurityGroup.securityGroupId, {
      name: `${prefix}-ecs-sg-id`,
    });

    // this.exportValue(documentDbSecurityGroup.securityGroupId, {
    //   name: `${prefix}-docdb-sg-id`,
    // });

    // this.exportValue(redisSecurityGroup.securityGroupId, {
    //   name: `${prefix}-redis-sg-id`,
    // });

    // Outputs
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
      exportName: `${prefix}-vpc-id`,
    });

    // Tags
    cdk.Tags.of(this.vpc).add('Name', `${prefix}-vpc`);
    cdk.Tags.of(albSecurityGroup).add('Name', `${prefix}-alb-sg`);
    cdk.Tags.of(ecsSecurityGroup).add('Name', `${prefix}-ecs-sg`);
    // cdk.Tags.of(documentDbSecurityGroup).add('Name', `${prefix}-docdb-sg`);
    // cdk.Tags.of(redisSecurityGroup).add('Name', `${prefix}-redis-sg`);

    // Store security groups as properties for cross-stack access
    (this as any).albSecurityGroup = albSecurityGroup;
    (this as any).ecsSecurityGroup = ecsSecurityGroup;
    // (this as any).documentDbSecurityGroup = documentDbSecurityGroup;
    // (this as any).redisSecurityGroup = redisSecurityGroup;
  }
}
