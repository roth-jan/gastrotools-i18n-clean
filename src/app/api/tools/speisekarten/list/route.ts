import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth-utils';

const prisma = new PrismaClient();

// GLOBAL shared demo menu store (same as create route)
declare global {
  var demoMenuStore: Map<string, any[]> | undefined;
}

global.demoMenuStore = global.demoMenuStore || new Map();

const getDemoMenus = (userId: string) => {
  if (!global.demoMenuStore?.has(userId)) {
    global.demoMenuStore?.set(userId, [
      {
        id: 'demo-menu-1',
        name: 'Demo Restaurant Speisekarte',
        template: 'elegant-classic',
        lastModified: new Date(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'demo-menu-2',
        name: 'Café Mittagskarte',
        template: 'cozy-cafe',
        lastModified: new Date(Date.now() - 86400000),
        updatedAt: new Date(Date.now() - 86400000).toISOString()
      }
    ]);
  }
  return global.demoMenuStore?.get(userId) || [];
};

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

    // Handle demo user with shared persistent storage  
    if (user.id === 'demo-user-123') {
      const menus = getDemoMenus(user.id);
      console.log(`📋 DEMO MENUS REQUESTED: ${menus.length} menus found`)
      return NextResponse.json({ menus });
    }

    // Fetch user's menus
    const menus = await prisma.menu.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        updatedAt: 'desc'
      },
      select: {
        id: true,
        name: true,
        template: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      menus: menus.map(menu => ({
        id: menu.id,
        name: menu.name,
        template: menu.template,
        lastModified: menu.updatedAt,
        updatedAt: menu.updatedAt.toISOString()
      }))
    });

  } catch (error) {
    console.error('Menu list error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Speisekarten' },
      { status: 500 }
    );
  }
}