import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth-utils';
import { uploadToS3, generateFileKey } from '@/lib/aws-s3';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    const { menuId, format } = await request.json();
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Check export limits
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

    // Check if export limit reached for free users
    if (user.plan === 'free' && usage.exportsCount >= 5) {
      return NextResponse.json(
        { 
          error: 'Export-Limit erreicht',
          limitReached: true 
        },
        { status: 403 }
      );
    }

    // Get menu data
    const menu = await prisma.menu.findUnique({
      where: {
        id: menuId,
        userId: user.id
      }
    });

    if (!menu) {
      return NextResponse.json(
        { error: 'Speisekarte nicht gefunden' },
        { status: 404 }
      );
    }

    // For now, we'll return a placeholder response
    // In a real implementation, you would generate the PDF here
    // using a library like puppeteer or jsPDF on the server

    // Update export count
    await prisma.usageTracking.update({
      where: { id: usage.id },
      data: { exportsCount: usage.exportsCount + 1 }
    });

    // Generate file key
    const fileName = `${menu.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    const fileKey = generateFileKey(fileName, 'exports');

    // In production, you would generate actual PDF content here
    // For now, return mock data
    return NextResponse.json({
      success: true,
      exportUrl: `/api/download?key=${fileKey}`,
      fileName,
      format,
      usage: {
        current: usage.exportsCount + 1,
        limit: 5
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Exportieren' },
      { status: 500 }
    );
  }
}