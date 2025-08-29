import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth-utils';

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

    const { name, category, quantity, unit, minStock, maxStock, supplier, barcode } = await request.json();

    // Handle demo user
    if (user.id === 'demo-user-123') {
      // Return success but don't actually save
      return NextResponse.json({
        itemId: `demo-item-${Date.now()}`,
        inventoryCount: 15, // Demo has 15 items
        limit: 100,
        message: 'Demo item created (not persisted)'
      });
    }

    // Check inventory count
    const currentCount = await prisma.inventoryItem.count({
      where: { userId: user.id }
    });

    // Check if limit reached for free users
    if (user.plan === 'free' && currentCount >= 100) {
      // Create lead if first time hitting limit
      const existingLead = await prisma.lead.findFirst({
        where: {
          email: user.email,
          toolInterest: 'lagerverwaltung'
        }
      });

      if (!existingLead) {
        await prisma.lead.create({
          data: {
            email: user.email,
            name: user.name,
            company: user.company || '',
            phone: '',
            toolInterest: 'lagerverwaltung',
            source: 'freemium_limit_reached',
            status: 'new'
          }
        });
      }

      return NextResponse.json(
        { 
          error: 'Artikellimit erreicht',
          limitReached: true 
        },
        { status: 403 }
      );
    }

    // Create new inventory item
    const item = await prisma.inventoryItem.create({
      data: {
        userId: user.id,
        name,
        category,
        quantity,
        unit,
        minStock,
        maxStock,
        supplier,
        barcode
      }
    });

    return NextResponse.json({
      itemId: item.id,
      inventoryCount: currentCount + 1,
      limit: 100
    });

  } catch (error) {
    console.error('Inventory creation error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Artikels' },
      { status: 500 }
    );
  }
}