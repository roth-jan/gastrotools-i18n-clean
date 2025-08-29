import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth-utils';

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

    // Simple admin check
    if (!user.email.includes('admin@gastrotools.de')) {
      return NextResponse.json(
        { error: 'Keine Berechtigung' },
        { status: 403 }
      );
    }

    // Get lead statistics
    const [totalLeads, newLeads, contactedLeads, convertedLeads] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { status: 'new' } }),
      prisma.lead.count({ where: { status: 'contacted' } }),
      prisma.lead.count({ where: { status: 'converted' } })
    ]);

    // Get user statistics
    const totalUsers = await prisma.user.count();
    const freeUsers = await prisma.user.count({ where: { plan: 'free' } });
    const premiumUsers = await prisma.user.count({ where: { plan: 'premium' } });

    // Get current month usage stats
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyUsage = await prisma.usageTracking.aggregate({
      where: { month: currentMonth },
      _sum: {
        speisekartenCount: true,
        recipesCount: true,
        exportsCount: true
      }
    });

    return NextResponse.json({
      stats: {
        totalLeads,
        newLeads,
        contactedLeads,
        convertedLeads,
        totalUsers,
        freeUsers,
        premiumUsers,
        monthlyUsage: {
          speisekarten: monthlyUsage._sum.speisekartenCount || 0,
          recipes: monthlyUsage._sum.recipesCount || 0,
          exports: monthlyUsage._sum.exportsCount || 0
        }
      }
    });

  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Statistiken' },
      { status: 500 }
    );
  }
}