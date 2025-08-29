import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  services: {
    database: 'healthy' | 'unhealthy';
    s3: 'healthy' | 'unhealthy' | 'not configured';
    redis?: 'healthy' | 'unhealthy' | 'not configured';
  };
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    environment: string;
    version: string;
    nodeVersion: string;
  };
  metrics?: {
    responseTime: number;
    requestCount?: number;
    errorRate?: number;
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const checks: Array<Promise<any>> = [];
  const services: HealthStatus['services'] = {
    database: 'unhealthy',
    s3: 'not configured',
    redis: 'not configured'
  };

  // Database health check
  checks.push(
    prisma.$queryRaw`SELECT 1`
      .then(() => { services.database = 'healthy'; })
      .catch(() => { services.database = 'unhealthy'; })
  );

  // S3 health check
  if (process.env.AWS_ACCESS_KEY_ID) {
    checks.push(
      (async () => {
        try {
          const { S3Client, HeadBucketCommand } = await import('@aws-sdk/client-s3');
          const s3Client = new S3Client({
            region: process.env.AWS_REGION || 'eu-central-1',
            endpoint: process.env.AWS_ENDPOINT_URL, // For MinIO compatibility
            forcePathStyle: !!process.env.AWS_ENDPOINT_URL
          });
          
          if (process.env.AWS_S3_BUCKET) {
            await s3Client.send(new HeadBucketCommand({ 
              Bucket: process.env.AWS_S3_BUCKET 
            }));
          }
          services.s3 = 'healthy';
        } catch (error) {
          services.s3 = 'unhealthy';
        }
      })()
    );
  }

  // Redis health check (if configured)
  if (process.env.REDIS_URL) {
    services.redis = 'not configured'; // Will be implemented if Redis is added
  }

  // Wait for all checks to complete
  await Promise.allSettled(checks);

  // Calculate overall health status
  const isHealthy = services.database === 'healthy' && 
    (services.s3 === 'healthy' || services.s3 === 'not configured');
  
  const isDegraded = services.database === 'healthy' && 
    services.s3 === 'unhealthy';

  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
  if (!isHealthy) {
    overallStatus = isDegraded ? 'degraded' : 'unhealthy';
  }

  // System metrics
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  const responseTime = Date.now() - startTime;

  const healthResponse: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime),
    services,
    system: {
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
      },
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version
    },
    metrics: {
      responseTime
    }
  };

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(healthResponse, { 
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}