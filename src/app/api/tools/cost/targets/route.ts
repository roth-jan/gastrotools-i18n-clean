import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth-utils';

const prisma = new PrismaClient();

// GET cost targets
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    // For demo user, return default targets
    if (user.id === 'demo-user-123') {
      return NextResponse.json({
        targets: [
          { id: '1', categoryId: null, targetType: 'percentage', targetValue: 30, period: 'monthly', alertEnabled: true, alertThreshold: 90 },
          { id: '2', categoryId: '1', targetType: 'percentage', targetValue: 30, period: 'monthly', alertEnabled: true, alertThreshold: 85 },
          { id: '3', categoryId: '2', targetType: 'percentage', targetValue: 30, period: 'monthly', alertEnabled: true, alertThreshold: 85 }
        ]
      });
    }

    const targets = await prisma.costTarget.findMany({
      where: { 
        userId: user.id,
        isActive: true 
      },
      include: {
        category: {
          select: { name: true }
        }
      }
    });

    // Create default targets if none exist
    if (targets.length === 0) {
      // Overall target
      await prisma.costTarget.create({
        data: {
          userId: user.id,
          targetType: 'percentage',
          targetValue: 30,
          period: 'monthly',
          alertEnabled: true,
          alertThreshold: 90
        }
      });

      // Food cost target
      const foodCategory = await prisma.costCategory.findFirst({
        where: { userId: user.id, name: 'Lebensmittel' }
      });
      
      if (foodCategory) {
        await prisma.costTarget.create({
          data: {
            userId: user.id,
            categoryId: foodCategory.id,
            targetType: 'percentage',
            targetValue: 30,
            period: 'monthly',
            alertEnabled: true,
            alertThreshold: 85
          }
        });
      }

      // Labor cost target
      const laborCategory = await prisma.costCategory.findFirst({
        where: { userId: user.id, name: 'Personal' }
      });
      
      if (laborCategory) {
        await prisma.costTarget.create({
          data: {
            userId: user.id,
            categoryId: laborCategory.id,
            targetType: 'percentage',
            targetValue: 30,
            period: 'monthly',
            alertEnabled: true,
            alertThreshold: 85
          }
        });
      }

      // Fetch again
      const newTargets = await prisma.costTarget.findMany({
        where: { userId: user.id, isActive: true },
        include: { category: { select: { name: true } } }
      });

      return NextResponse.json({ targets: newTargets });
    }

    return NextResponse.json({ targets });

  } catch (error) {
    console.error('Targets fetch error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Ziele' },
      { status: 500 }
    );
  }
}

// POST/PUT update target
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const body = await request.json();
    const { categoryId, targetType, targetValue, period, alertEnabled, alertThreshold } = body;

    if (!targetType || !targetValue || !period) {
      return NextResponse.json(
        { error: 'Typ, Wert und Periode sind erforderlich' },
        { status: 400 }
      );
    }

    // Check if target exists
    const existingTarget = await prisma.costTarget.findFirst({
      where: {
        userId: user.id,
        categoryId: categoryId || null,
        period
      }
    });

    let target;
    if (existingTarget) {
      // Update existing
      target = await prisma.costTarget.update({
        where: { id: existingTarget.id },
        data: {
          targetType,
          targetValue,
          alertEnabled: alertEnabled ?? true,
          alertThreshold: alertThreshold || 90
        }
      });
    } else {
      // Create new
      target = await prisma.costTarget.create({
        data: {
          userId: user.id,
          categoryId: categoryId || null,
          targetType,
          targetValue,
          period,
          alertEnabled: alertEnabled ?? true,
          alertThreshold: alertThreshold || 90
        }
      });
    }

    return NextResponse.json({ target });

  } catch (error) {
    console.error('Target update error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Ziels' },
      { status: 500 }
    );
  }
}