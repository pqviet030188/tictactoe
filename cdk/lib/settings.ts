/**
 * Centralized configuration constants for CDK infrastructure
 */

import * as cdk from 'aws-cdk-lib';

export const Settings = {

  storefront:{
    url: process.env.FRONTEND_URL as string
  },
  // Default values for configuration
  defaults: {
    /** AWS region where resources will be deployed */
    region: 'ap-southeast-2',
    /** Project name used for resource naming and tagging */
    projectName: 'TicTacToe',
    /** Default environment if not specified (dev, staging, or prod) */
    environment: 'dev',
  },

  // Network configuration
  network: {
    /** Number of Availability Zones to use for VPC (2 for high availability) */
    maxAzs: 2,
    /** Number of NAT Gateways (1 to reduce cost, 2+ for high availability) */
    natGateways: 1,
    /** CIDR mask for subnet sizing (/24 = 256 addresses per subnet) */
    subnetCidrMask: 24,
    ports: {
      /** HTTP port for load balancer */
      http: 80,
      /** HTTPS port for load balancer (future use) */
      https: 443,
      /** Backend API server port */
      backend: 5000,
      /** DocumentDB (MongoDB) port */
      mongodb: 27017,
      /** Redis cache port */
      redis: 6379,
    },
  },

  // Database configuration
  presetDatabase: {
    documentDb: {
      connectionString: process.env.MONGODB_CONNECTION_STRING as string
    },
    redis: {
      connectionString: process.env.REDIS_CONNECTION_STRING as string
    }
  },
  database: {
    documentDb: {
      instanceTypes: {
        /** DocumentDB instance type for development environment */
        dev: 'db.t4g.small',
        /** DocumentDB instance type for staging environment */
        staging: 'db.t4g.small',
        /** DocumentDB instance type for production environment */
        prod: 'db.t4g.small',
      },
      /** Default DocumentDB instance type if environment not matched */
      defaultInstanceType: 'db.t4g.small',
      /** Default number of DocumentDB cluster instances */
      defaultInstances: 1,
      /** DocumentDB connection port (MongoDB compatible) */
      port: 27017,
      /** DocumentDB parameter group family version */
      parameterGroupFamily: 'docdb5.0',
      backupRetention: {
        /** Backup retention period for production (7 days) */
        prod: cdk.Duration.days(7),
        /** Backup retention period for non-production (1 day) */
        default: cdk.Duration.days(1),
      },
      /** Daily backup window in UTC (3:00 AM - 4:00 AM) */
      backupWindow: '03:00-04:00',
      /** Weekly maintenance window (Sunday 4:00 AM - 5:00 AM UTC) */
      maintenanceWindow: 'sun:04:00-sun:05:00',
    },
    redis: {
      nodeTypes: {
        /** Redis node type for development environment */
        dev: 'cache.t4g.micro',
        /** Redis node type for staging environment */
        staging: 'cache.t4g.micro',
        /** Redis node type for production environment */
        prod: 'cache.t4g.micro',
      },
      /** Default Redis node type if environment not matched */
      defaultNodeType: 'cache.t4g.micro',
      /** Default number of Redis cache nodes */
      defaultNumNodes: 1,
      /** Redis connection port */
      port: 6379,
      /** Redis parameter group family */
      parameterGroupFamily: 'redis7',
      /** Redis engine version */
      engineVersion: '7.0',
      /** Memory eviction policy (least recently used keys evicted first) */
      maxMemoryPolicy: 'allkeys-lru',
      snapshotRetention: {
        /** Snapshot retention period for production (7 days) */
        prod: 7,
        /** Snapshot retention period for non-production (1 day) */
        default: 1,
      },
      /** Daily snapshot window in UTC (3:00 AM - 4:00 AM) */
      snapshotWindow: '03:00-04:00',
      /** Weekly maintenance window (Sunday 5:00 AM - 6:00 AM UTC) */
      maintenanceWindow: 'sun:05:00-sun:06:00',
    },
  },

  // Backend ECS configuration
  backend: {
    /** Default CPU units for ECS task (256 = 0.25 vCPU) */
    defaultCpu: 256, // 0.25 vCPU
    /** Default memory for ECS task in MB (512 = 0.5 GB) */
    defaultMemory: 512, // 0.5 GB
    /** Default number of ECS tasks to run */
    defaultDesiredCount: 1,
    /** Backend API server listening port */
    port: 5000,
    healthCheck: {
      /** Health check endpoint path */
      path: '/health',
      /** Interval between health checks */
      interval: cdk.Duration.seconds(30),
      /** Timeout for each health check request */
      timeout: cdk.Duration.seconds(5),
      /** Number of consecutive successful checks to mark healthy */
      healthyThresholdCount: 2,
      /** Number of consecutive failed checks to mark unhealthy */
      unhealthyThresholdCount: 3,
      /** Grace period before health checks start after container launch */
      startPeriod: cdk.Duration.seconds(60),
    },
    autoScaling: {
      /** Minimum number of ECS tasks when scaling in */
      defaultMinCapacity: 1,
      /** Maximum number of ECS tasks when scaling out */
      defaultMaxCapacity: 3,
      cpu: {
        /** Target CPU utilization percentage to trigger scaling */
        targetUtilization: 70,
        /** Cooldown period after scaling in (prevents flapping) */
        scaleInCooldown: cdk.Duration.seconds(60),
        /** Cooldown period after scaling out (prevents flapping) */
        scaleOutCooldown: cdk.Duration.seconds(60),
      },
      memory: {
        /** Target memory utilization percentage to trigger scaling */
        targetUtilization: 80,
        /** Cooldown period after scaling in (prevents flapping) */
        scaleInCooldown: cdk.Duration.seconds(60),
        /** Cooldown period after scaling out (prevents flapping) */
        scaleOutCooldown: cdk.Duration.seconds(60),
      },
    },
    loadBalancer: {
      /** Time to wait before starting health checks on new tasks */
      healthCheckGracePeriod: cdk.Duration.seconds(60),
      /** Time to wait before deregistering targets during deployments */
      deregistrationDelay: cdk.Duration.seconds(30),
      /** Minimum percentage of healthy tasks during deployment */
      minHealthyPercent: 50,
      /** Maximum percentage of tasks during deployment (allows extra tasks) */
      maxHealthyPercent: 200,
      /** Duration for sticky session cookies */
      stickinessCookieDuration: cdk.Duration.hours(1),
    },
    ecr: {
      /** Maximum number of Docker images to retain in ECR repository */
      maxImageCount: 10,
      /** Enable automatic vulnerability scanning on image push */
      imageScanOnPush: true,
    },
    logging: {
      retention: {
        /** CloudWatch log retention for production (30 days) */
        prod: cdk.aws_logs.RetentionDays.ONE_MONTH,
        /** CloudWatch log retention for non-production (7 days) */
        default: cdk.aws_logs.RetentionDays.ONE_WEEK,
      },
    },
  },

  // Frontend CloudFront configuration
  frontend: {
    caching: {
      staticAssets: {
        /** Default cache TTL for static assets (JS, CSS, images) */
        defaultTtl: cdk.Duration.days(7),
        /** Maximum cache TTL for static assets */
        maxTtl: cdk.Duration.days(365),
        /** Minimum cache TTL for static assets */
        minTtl: cdk.Duration.seconds(0),
      },
      html: {
        /** Default cache TTL for HTML files (shorter for dynamic content) */
        defaultTtl: cdk.Duration.minutes(5),
        /** Maximum cache TTL for HTML files */
        maxTtl: cdk.Duration.hours(1),
        /** Minimum cache TTL for HTML files */
        minTtl: cdk.Duration.seconds(0),
      },
    },
    errorResponses: {
      /** TTL for error responses cached by CloudFront */
      ttl: cdk.Duration.minutes(5),
      /** Error response configurations for SPA routing (404/403 → index.html) */
      codes: [
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
    },
    /** CloudFront price class (PRICE_CLASS_100 = North America and Europe only) */
    priceClass: 'PRICE_CLASS_100', // North America and Europe only
    logging: {
      enabled: {
        /** Enable CloudFront access logs for production */
        prod: true,
        /** Disable CloudFront access logs for non-production (cost savings) */
        default: false,
      },
      /** CloudFront access log retention period */
      retention: cdk.Duration.days(90),
    },
  },

  // JWT configuration
  jwt: {
    /** Length of randomly generated JWT secret string in bytes */
    secretLength: 64,
  },

  // Tags
  tags: {
    /** Tag to identify resources managed by AWS CDK */
    managedBy: 'CDK',
  },
} as const;

/** Type alias for environment names */
export type Environment = 'dev' | 'staging' | 'prod';

/**
 * Get the DocumentDB instance type for a specific environment
 * @param env - Environment name (dev, staging, or prod)
 * @returns DocumentDB instance type string (e.g., 'db.t3.medium')
 */
export const getDocumentDbInstanceType = (env: string): string => {
  return Settings.database.documentDb.instanceTypes[env as Environment] 
    || Settings.database.documentDb.defaultInstanceType;
};

/**
 * Get the Redis node type for a specific environment
 * @param env - Environment name (dev, staging, or prod)
 * @returns Redis node type string (e.g., 'cache.t3.micro')
 */
export const getRedisNodeType = (env: string): string => {
  return Settings.database.redis.nodeTypes[env as Environment] 
    || Settings.database.redis.defaultNodeType;
};

/**
 * Get the backup retention duration based on environment
 * @param env - Environment name (dev, staging, or prod)
 * @returns Duration object (7 days for prod, 1 day otherwise)
 */
export const getBackupRetention = (env: string): cdk.Duration => {
  return env === 'prod' 
    ? Settings.database.documentDb.backupRetention.prod 
    : Settings.database.documentDb.backupRetention.default;
};

/**
 * Get the CloudWatch log retention period based on environment
 * @param env - Environment name (dev, staging, or prod)
 * @returns RetentionDays enum value (1 month for prod, 1 week otherwise)
 */
export const getLogRetention = (env: string): cdk.aws_logs.RetentionDays => {
  return env === 'prod'
    ? Settings.backend.logging.retention.prod
    : Settings.backend.logging.retention.default;
};

/**
 * Check if the current environment is production
 * @param env - Environment name (dev, staging, or prod)
 * @returns true if production, false otherwise
 */
export const isProductionEnvironment = (env: string): boolean => {
  return env === 'prod';
};

/**
 * Generate a standardized resource name prefix
 * @param projectName - Project name
 * @param environment - Environment name (dev, staging, or prod)
 * @returns Formatted string like "TicTacToe-dev" or "TicTacToe-prod"
 */
export const getResourcePrefix = (projectName: string, environment: string): string => {
  return `${projectName}-${environment}`;
};
