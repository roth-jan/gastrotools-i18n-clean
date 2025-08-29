import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth, getDemoUsageTracking } from '@/lib/auth-utils';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    const currentMonth = new Date().toISOString().slice(0, 7);

    // Handle demo user specially
    if (user.id === 'demo-user-123') {
      const demoUsage = await getDemoUsageTracking();
      return NextResponse.json({
        usage: {
          speisekartenCount: demoUsage.speisekartenCount,
          recipesCount: demoUsage.recipesCount,
          exportsCount: demoUsage.exportsCount,
          inventoryCount: 15, // Demo inventory count
          costEntriesCount: demoUsage.costEntriesCount || 0
        },
        limits: {
          speisekarten: 3,
          recipes: 10,
          exports: 5,
          inventory: 100,
          costEntries: 50
        },
        month: currentMonth
      });
    }

    // Get or create usage tracking for regular users
    let usage = await prisma.usageTracking.findFirst({
      where: {
        userId: user.id,
        month: currentMonth
      }
    });

    if (!usage) {
      usage = await prisma.usageTracking.create({
        data: {
          userId: user.id,
          month: currentMonth,
          speisekartenCount: 0,
          recipesCount: 0,
          exportsCount: 0
        }
      });
    }

    // Get inventory count
    const inventoryCount = await prisma.inventoryItem.count({
      where: { userId: user.id }
    });

    return NextResponse.json({
      usage: {
        speisekartenCount: usage.speisekartenCount,
        recipesCount: usage.recipesCount,
        exportsCount: usage.exportsCount,
        inventoryCount,
        costEntriesCount: usage.costEntriesCount || 0
      },
      limits: {
        speisekarten: 3,
        recipes: 10,
        exports: 5,
        inventory: 100,
        costEntries: 50
      },
      month: currentMonth
    });

  } catch (error) {
    console.error('Usage fetch error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Nutzungsdaten' },
      { status: 500 }
    );
  }
}