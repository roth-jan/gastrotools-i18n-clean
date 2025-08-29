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

    // Handle demo user with static demo data
    if (user.id === 'demo-user-123') {
      const demoItems = [
        {
          id: 'demo-item-1',
          name: 'Tomaten',
          category: 'Gemüse',
          quantity: 15,
          unit: 'kg',
          minStock: 10,
          maxStock: 50,
          supplier: 'Bio-Hof Schmidt',
          barcode: '1234567890123',
          lastUpdated: new Date().toISOString()
        },
        {
          id: 'demo-item-2',
          name: 'Olivenöl Extra Vergine',
          category: 'Öle & Essig',
          quantity: 8,
          unit: 'Liter',
          minStock: 5,
          maxStock: 20,
          supplier: 'Italienischer Importeur',
          barcode: '9876543210987',
          lastUpdated: new Date().toISOString()
        },
        {
          id: 'demo-item-3',
          name: 'Mehl Type 405',
          category: 'Trockenwaren',
          quantity: 25,
          unit: 'kg',
          minStock: 20,
          maxStock: 100,
          supplier: 'Mühle Müller',
          barcode: '5555555555555',
          lastUpdated: new Date().toISOString()
        }
      ];
      
      return NextResponse.json({ items: demoItems });
    }

    // Fetch user's inventory items
    const items = await prisma.inventoryItem.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return NextResponse.json({
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        minStock: item.minStock,
        maxStock: item.maxStock,
        supplier: item.supplier,
        barcode: item.barcode,
        lastUpdated: item.updatedAt.toISOString()
      }))
    });

  } catch (error) {
    console.error('Inventory list error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Artikel' },
      { status: 500 }
    );
  }
}