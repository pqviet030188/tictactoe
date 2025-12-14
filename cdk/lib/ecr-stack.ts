import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';
import { getResourcePrefix, isProductionEnvironment } from '../settings';

export interface TicTacToeEcrStackProps extends cdk.StackProps {
  config: {
    projectName: string;
    environment: string;
  };
}

export class TicTacToeEcrStack extends cdk.Stack {
  public readonly ecrRepository: ecr.Repository;

  constructor(scope: Construct, id: string, props: TicTacToeEcrStackProps) {
    super(scope, id, props);

    const { config } = props;
    const prefix = getResourcePrefix(config.projectName, config.environment);

    // ============================================
    // ECR Repository for Backend Docker Images
    // ============================================

    this.ecrRepository = new ecr.Repository(this, 'BackendRepository', {
      repositoryName: `${config.projectName.toLowerCase()}-${config.environment}-backend`,
      removalPolicy: isProductionEnvironment(config.environment) 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteImages: !isProductionEnvironment(config.environment),
      imageScanOnPush: isProductionEnvironment(config.environment),
      imageTagMutability: isProductionEnvironment(config.environment)
        ? ecr.TagMutability.IMMUTABLE
        : ecr.TagMutability.MUTABLE,
      lifecycleRules: [
        {
          description: 'Keep last 10 images',
          maxImageCount: 10,
          rulePriority: 1,
        },
      ],
    });

    // ============================================
    // Outputs
    // ============================================

    new cdk.CfnOutput(this, 'RepositoryUri', {
      value: this.ecrRepository.repositoryUri,
      description: 'ECR repository URI',
      exportName: `${prefix}-ecr-uri`,
    });

    new cdk.CfnOutput(this, 'RepositoryName', {
      value: this.ecrRepository.repositoryName,
      description: 'ECR repository name',
      exportName: `${prefix}-ecr-name`,
    });

    new cdk.CfnOutput(this, 'RepositoryArn', {
      value: this.ecrRepository.repositoryArn,
      description: 'ECR repository ARN',
      exportName: `${prefix}-ecr-arn`,
    });

    // Tags
    cdk.Tags.of(this.ecrRepository).add('Name', `${prefix}-backend-ecr`);
  }
}
