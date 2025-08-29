import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth-utils';

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { status } = await request.json();
    const { id } = await params;

    // Update lead status
    const lead = await prisma.lead.update({
      where: {
        id
      },
      data: {
        status
      }
    });

    return NextResponse.json({
      success: true,
      lead
    });

  } catch (error) {
    console.error('Lead update error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Leads' },
      { status: 500 }
    );
  }
}