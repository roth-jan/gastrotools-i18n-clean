import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth-utils';

const prisma = new PrismaClient();

// GLOBAL shared demo menu store (same as list route)
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

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const { name, templateId, category } = body;

    // Handle demo user - persist to global store
    if (user.id === 'demo-user-123') {
      const menuId = `demo-menu-${Date.now()}`;
      const newMenu = {
        id: menuId,
        name: name || `Neue Speisekarte ${new Date().toLocaleDateString('de-DE')}`,
        template: templateId,
        lastModified: new Date(),
        updatedAt: new Date().toISOString()
      };
      
      // Get existing menus and add new one
      const menus = getDemoMenus(user.id);
      menus.unshift(newMenu); // Add to beginning for most recent first
      global.demoMenuStore?.set(user.id, menus);
      
      console.log(`📋 DEMO MENU CREATED: ${name} (ID: ${menuId}), Total menus: ${menus.length}`)
      
      return NextResponse.json({
        menuId,
        success: true,
        usage: {
          current: Math.min(menus.length - 2, 1), // Subtract the 2 default menus
          limit: 3
        }
      });
    }

    const currentMonth = new Date().toISOString().slice(0, 7);

    // Check usage limits
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

    // Check if limit reached for free users
    if (user.plan === 'free' && usage.speisekartenCount >= 3) {
      // Create lead if first time hitting limit
      const existingLead = await prisma.lead.findFirst({
        where: {
          email: user.email,
          toolInterest: 'speisekarten-designer'
        }
      });

      if (!existingLead) {
        await prisma.lead.create({
          data: {
            email: user.email,
            name: user.name,
            company: user.company || '',
            phone: '',
            toolInterest: 'speisekarten-designer',
            source: 'freemium_limit_reached',
            status: 'new'
          }
        });
      }

      return NextResponse.json(
        { 
          error: 'Monatliches Limit erreicht',
          limitReached: true 
        },
        { status: 403 }
      );
    }

    // Create new menu
    const menu = await prisma.menu.create({
      data: {
        userId: user.id,
        name: name || `Neue Speisekarte ${new Date().toLocaleDateString('de-DE')}`,
        template: templateId,
        content: JSON.stringify({
          sections: [],
          design: {
            template: templateId,
            category
          }
        })
      }
    });

    // Update usage count
    await prisma.usageTracking.update({
      where: { id: usage.id },
      data: { speisekartenCount: usage.speisekartenCount + 1 }
    });

    return NextResponse.json({
      menuId: menu.id,
      usage: {
        current: usage.speisekartenCount + 1,
        limit: 3
      }
    });

  } catch (error) {
    console.error('Menu creation error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Speisekarte' },
      { status: 500 }
    );
  }
}