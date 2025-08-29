import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Basic authentication for metrics endpoint
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.METRICS_API_KEY || 'change-this-key'}`;
    
    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get application metrics
    const [
      userCount,
      activeUsers,
      totalRecipes,
      totalMenus,
      totalInventoryItems,
      leadCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }),
      prisma.recipe.count(),
      prisma.menu.count(),
      prisma.inventoryItem.count(),
      prisma.lead.count()
    ]);

    // Get usage statistics
    const usageStats = await prisma.usageTracking.groupBy({
      by: ['userId'],
      _sum: {
        speisekartenCount: true,
        recipesCount: true,
        exportsCount: true
      }
    });

    // System metrics
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    // Format for Prometheus/monitoring systems
    const metrics = {
      // Application metrics
      gastrotools_users_total: userCount,
      gastrotools_users_active_30d: activeUsers,
      gastrotools_recipes_total: totalRecipes,
      gastrotools_menus_total: totalMenus,
      gastrotools_inventory_items_total: totalInventoryItems,
      gastrotools_leads_total: leadCount,
      
      // Usage metrics aggregated
      gastrotools_speisekarten_total: usageStats.reduce((sum, stat) => sum + (stat._sum.speisekartenCount || 0), 0),
      gastrotools_recipes_usage_total: usageStats.reduce((sum, stat) => sum + (stat._sum.recipesCount || 0), 0),
      gastrotools_exports_total: usageStats.reduce((sum, stat) => sum + (stat._sum.exportsCount || 0), 0),
      
      // System metrics
      gastrotools_memory_heap_used_bytes: memoryUsage.heapUsed,
      gastrotools_memory_heap_total_bytes: memoryUsage.heapTotal,
      gastrotools_memory_external_bytes: memoryUsage.external,
      gastrotools_uptime_seconds: Math.floor(uptime),
      
      // Timestamps
      gastrotools_last_scrape_timestamp: Date.now()
    };

    // Return in Prometheus format if requested
    const acceptHeader = request.headers.get('accept');
    if (acceptHeader && acceptHeader.includes('text/plain')) {
      const prometheusFormat = Object.entries(metrics)
        .map(([key, value]) => `${key} ${value}`)
        .join('\n');
      
      return new NextResponse(prometheusFormat, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8'
        }
      });
    }

    // Return JSON format by default
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      metrics
    });

  } catch (error) {
    console.error('Metrics endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}