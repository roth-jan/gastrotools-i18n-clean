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

    // Simple admin check - in production use proper roles
    if (!user.email.includes('admin@gastrotools.de')) {
      return NextResponse.json(
        { error: 'Keine Berechtigung' },
        { status: 403 }
      );
    }

    // Fetch all leads
    const leads = await prisma.lead.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      leads: leads.map(lead => ({
        id: lead.id,
        name: lead.name,
        email: lead.email,
        company: lead.company,
        phone: lead.phone,
        toolInterest: lead.toolInterest,
        source: lead.source,
        status: lead.status,
        createdAt: lead.createdAt.toISOString()
      }))
    });

  } catch (error) {
    console.error('Leads fetch error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Leads' },
      { status: 500 }
    );
  }
}