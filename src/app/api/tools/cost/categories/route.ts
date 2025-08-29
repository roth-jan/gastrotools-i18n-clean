import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth-utils';

const prisma = new PrismaClient();

// GET all cost categories for user
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    // For demo user, return predefined categories
    if (user.id === 'demo-user-123') {
      return NextResponse.json({
        categories: [
          { id: '1', name: 'Lebensmittel', type: 'variable', color: '#10b981', icon: '🥘', sortOrder: 1 },
          { id: '2', name: 'Personal', type: 'variable', color: '#3b82f6', icon: '👥', sortOrder: 2 },
          { id: '3', name: 'Miete', type: 'fixed', color: '#6366f1', icon: '🏠', sortOrder: 3 },
          { id: '4', name: 'Energie', type: 'fixed', color: '#f59e0b', icon: '⚡', sortOrder: 4 },
          { id: '5', name: 'Marketing', type: 'variable', color: '#ec4899', icon: '📣', sortOrder: 5 },
          { id: '6', name: 'Sonstiges', type: 'variable', color: '#6b7280', icon: '📦', sortOrder: 6 }
        ]
      });
    }

    // Get user's categories
    const categories = await prisma.costCategory.findMany({
      where: { 
        userId: user.id,
        isActive: true 
      },
      orderBy: { sortOrder: 'asc' }
    });

    // If no categories exist, create default ones
    if (categories.length === 0) {
      const defaultCategories = [
        { name: 'Lebensmittel', type: 'variable', color: '#10b981', icon: '🥘', sortOrder: 1 },
        { name: 'Personal', type: 'variable', color: '#3b82f6', icon: '👥', sortOrder: 2 },
        { name: 'Miete', type: 'fixed', color: '#6366f1', icon: '🏠', sortOrder: 3 },
        { name: 'Energie', type: 'fixed', color: '#f59e0b', icon: '⚡', sortOrder: 4 },
        { name: 'Marketing', type: 'variable', color: '#ec4899', icon: '📣', sortOrder: 5 },
        { name: 'Sonstiges', type: 'variable', color: '#6b7280', icon: '📦', sortOrder: 6 }
      ];

      for (const cat of defaultCategories) {
        await prisma.costCategory.create({
          data: {
            ...cat,
            userId: user.id
          }
        });
      }

      // Fetch again
      const newCategories = await prisma.costCategory.findMany({
        where: { userId: user.id, isActive: true },
        orderBy: { sortOrder: 'asc' }
      });

      return NextResponse.json({ categories: newCategories });
    }

    return NextResponse.json({ categories });

  } catch (error) {
    console.error('Categories fetch error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Kategorien' },
      { status: 500 }
    );
  }
}

// POST new category
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, color, icon } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name und Typ sind erforderlich' },
        { status: 400 }
      );
    }

    // Get next sort order
    const lastCategory = await prisma.costCategory.findFirst({
      where: { userId: user.id },
      orderBy: { sortOrder: 'desc' }
    });

    const category = await prisma.costCategory.create({
      data: {
        userId: user.id,
        name,
        type,
        color: color || '#6b7280',
        icon: icon || '📦',
        sortOrder: (lastCategory?.sortOrder || 0) + 1
      }
    });

    return NextResponse.json({ category });

  } catch (error) {
    console.error('Category creation error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Kategorie' },
      { status: 500 }
    );
  }
}