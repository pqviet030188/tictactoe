import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { specifications, isProductionEnvironment, getResourcePrefix } from '../settings';

export interface TicTacToeFrontendStackProps extends cdk.StackProps {
  backendUrl: string;
  config: {
    projectName: string;
    environment: string;
    domain?: string;
    certificateArn?: string;
  };
}

export class TicTacToeFrontendStack extends cdk.Stack {
  public readonly distributionUrl: string;
  public readonly bucketName: string;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: TicTacToeFrontendStackProps) {
    super(scope, id, props);

    const { config } = props;
    const prefix = getResourcePrefix(config.projectName, config.environment);

    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `${config.projectName.toLowerCase()}-${config.environment}-frontend`,
      removalPolicy: isProductionEnvironment(config.environment) ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProductionEnvironment(config.environment),
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: isProductionEnvironment(config.environment),
      lifecycleRules: isProductionEnvironment(config.environment) ? [
        {
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ] : [],
    });

    this.bucketName = websiteBucket.bucketName;

    // Cache policy for static assets
    const staticAssetsCachePolicy = new cloudfront.CachePolicy(this, 'StaticAssetsCachePolicy', {
      cachePolicyName: `${prefix}-static-cache`,
      comment: 'Cache policy for static assets (JS, CSS, images)',
      defaultTtl: specifications.frontend.caching.staticAssets.defaultTtl,
      maxTtl: specifications.frontend.caching.staticAssets.maxTtl,
      minTtl: specifications.frontend.caching.staticAssets.minTtl,
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    // Cache policy for HTML (shorter TTL)
    const htmlCachePolicy = new cloudfront.CachePolicy(this, 'HtmlCachePolicy', {
      cachePolicyName: `${prefix}-html-cache`,
      comment: 'Cache policy for HTML files',
      defaultTtl: specifications.frontend.caching.html.defaultTtl,
      maxTtl: specifications.frontend.caching.html.maxTtl,
      minTtl: specifications.frontend.caching.html.minTtl,
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    // CloudFront distribution configuration
    const distributionConfig: cloudfront.DistributionProps = {
      comment: `${config.projectName} ${config.environment} frontend distribution`,
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: htmlCachePolicy,
        compress: true,
      },
      additionalBehaviors: {
        '/assets/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: staticAssetsCachePolicy,
          compress: true,
        },
        '*.js': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: staticAssetsCachePolicy,
          compress: true,
        },
        '*.css': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: staticAssetsCachePolicy,
          compress: true,
        },
      },
      errorResponses: specifications.frontend.errorResponses.codes.map(code => ({
        httpStatus: code.httpStatus,
        responseHttpStatus: code.responseHttpStatus,
        responsePagePath: code.responsePagePath,
        ttl: specifications.frontend.errorResponses.ttl,
      })),
      priceClass: cloudfront.PriceClass[specifications.frontend.priceClass as keyof typeof cloudfront.PriceClass],
      enableLogging: isProductionEnvironment(config.environment) && specifications.frontend.logging.enabled.prod,
      logBucket: isProductionEnvironment(config.environment) && specifications.frontend.logging.enabled.prod ? new s3.Bucket(this, 'LogBucket', {
        bucketName: `${config.projectName.toLowerCase()}-${config.environment}-frontend-logs`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        lifecycleRules: [
          {
            expiration: specifications.frontend.logging.retention,
          },
        ],
      }) : undefined,
      // Add custom domain and certificate if provided
      ...(config.domain && config.certificateArn ? {
        domainNames: [config.domain],
        certificate: cdk.aws_certificatemanager.Certificate.fromCertificateArn(
          this,
          'Certificate',
          config.certificateArn
        ),
      } : {}),
    };

    this.distribution = new cloudfront.Distribution(this, 'Distribution', distributionConfig);

    this.distributionUrl = `https://${this.distribution.distributionDomainName}`;

    /*
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset('../Frontend/dist')],
      destinationBucket: websiteBucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    });
    */

    new cdk.CfnOutput(this, 'WebsiteBucketName', {
      value: websiteBucket.bucketName,
      description: 'S3 bucket name for frontend',
      exportName: `${prefix}-frontend-bucket`,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID',
      exportName: `${prefix}-cf-dist-id`,
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
      exportName: `${prefix}-cf-domain`,
    });

    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: this.distributionUrl,
      description: 'Frontend URL',
      exportName: `${prefix}-frontend-url`,
    });

    new cdk.CfnOutput(this, 'BackendApiUrl', {
      value: props.backendUrl,
      description: 'Backend API URL (for frontend configuration)',
    });

    // Tags
    cdk.Tags.of(websiteBucket).add('Name', `${prefix}-frontend`);
    cdk.Tags.of(this.distribution).add('Name', `${prefix}-cf-dist`);
  }
}
