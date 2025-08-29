import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth-utils';

const prisma = new PrismaClient();

// Calculate menu margins based on recipe costs and menu prices
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const body = await request.json();
    const { menuId } = body;

    if (!menuId) {
      return NextResponse.json({ error: 'Menu ID erforderlich' }, { status: 400 });
    }

    // Get menu with content
    const menu = await prisma.menu.findFirst({
      where: { id: menuId, userId: user.id }
    });

    if (!menu) {
      return NextResponse.json({ error: 'Speisekarte nicht gefunden' }, { status: 404 });
    }

    const menuContent = menu.content as any;
    if (!menuContent?.categories) {
      return NextResponse.json({ error: 'Keine Speisekarten-Inhalte gefunden' }, { status: 400 });
    }

    // Get all recipes with cost data
    const recipes = await prisma.recipe.findMany({
      where: { userId: user.id },
      include: {
        ingredientCosts: true
      }
    });

    const menuMargins = [];
    let totalMargin = 0;
    let totalRevenue = 0;
    let totalCost = 0;
    let itemCount = 0;

    // Process each category and item
    for (const category of menuContent.categories) {
      for (const item of category.items || []) {
        const itemName = item.name?.toLowerCase() || '';
        const itemPrice = parseFloat(item.price) || 0;
        
        if (itemPrice === 0) continue;

        // Try to match menu item with recipe
        const matchingRecipe = recipes.find(recipe => 
          recipe.name.toLowerCase().includes(itemName) ||
          itemName.includes(recipe.name.toLowerCase()) ||
          recipe.name.toLowerCase().split(' ').some(word => 
            itemName.includes(word) && word.length > 3
          )
        );

        let itemCost = 0;
        let margin = 0;
        let marginPercent = 0;
        let matchType = 'none';

        if (matchingRecipe && matchingRecipe.totalCost) {
          itemCost = matchingRecipe.costPerServing || matchingRecipe.totalCost;
          margin = itemPrice - itemCost;
          marginPercent = itemCost > 0 ? (margin / itemPrice) * 100 : 0;
          matchType = 'recipe';
        } else {
          // Estimate based on food cost percentage (assume 30% food cost)
          itemCost = itemPrice * 0.30;
          margin = itemPrice - itemCost;
          marginPercent = 70; // 70% margin estimate
          matchType = 'estimated';
        }

        const itemAnalysis = {
          name: item.name,
          category: category.name,
          price: itemPrice,
          cost: Math.round(itemCost * 100) / 100,
          margin: Math.round(margin * 100) / 100,
          marginPercent: Math.round(marginPercent * 10) / 10,
          matchType,
          recipeId: matchingRecipe?.id,
          recipeName: matchingRecipe?.name
        };

        menuMargins.push(itemAnalysis);

        // Update totals
        totalRevenue += itemPrice;
        totalCost += itemCost;
        totalMargin += margin;
        itemCount++;

        // Save/update menu item record
        const existingMenuItem = await prisma.menuItem.findFirst({
          where: {
            userId: user.id,
            menuId: menu.id,
            name: item.name
          }
        });

        if (existingMenuItem) {
          await prisma.menuItem.update({
            where: { id: existingMenuItem.id },
            data: {
              price: itemPrice,
              cost: itemCost,
              margin: margin,
              marginPercent: marginPercent,
              category: category.name,
              recipeId: matchingRecipe?.id
            }
          });
        } else {
          await prisma.menuItem.create({
            data: {
              userId: user.id,
              menuId: menu.id,
              name: item.name,
              description: item.description,
              category: category.name,
              price: itemPrice,
              cost: itemCost,
              margin: margin,
              marginPercent: marginPercent,
              recipeId: matchingRecipe?.id
            }
          });
        }
      }
    }

    const avgMarginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

    // Update menu with calculated margins
    await prisma.menu.update({
      where: { id: menu.id },
      data: {
        totalMargin: Math.round(totalMargin * 100) / 100,
        avgMargin: Math.round(avgMarginPercent * 10) / 10,
        lastMarginCalc: new Date()
      }
    });

    // Generate insights
    const insights = [];
    
    if (avgMarginPercent < 60) {
      insights.push({
        type: 'warning',
        message: `Durchschnittsmarge von ${avgMarginPercent.toFixed(1)}% ist niedrig. Ziel: 65-75%`
      });
    } else if (avgMarginPercent > 80) {
      insights.push({
        type: 'success',
        message: `Ausgezeichnete Marge von ${avgMarginPercent.toFixed(1)}%!`
      });
    }

    const lowMarginItems = menuMargins.filter(item => item.marginPercent < 50);
    if (lowMarginItems.length > 0) {
      insights.push({
        type: 'warning',
        message: `${lowMarginItems.length} Artikel haben eine Marge unter 50%`
      });
    }

    const estimatedItems = menuMargins.filter(item => item.matchType === 'estimated');
    if (estimatedItems.length > 0) {
      insights.push({
        type: 'info',
        message: `${estimatedItems.length} Artikel verwenden Schätzwerte. Erstellen Sie Rezepte für genauere Kalkulationen.`
      });
    }

    return NextResponse.json({
      menuId: menu.id,
      menuName: menu.name,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        totalMargin: Math.round(totalMargin * 100) / 100,
        avgMarginPercent: Math.round(avgMarginPercent * 10) / 10,
        itemCount
      },
      items: menuMargins,
      insights,
      calculation: {
        recipeMatches: menuMargins.filter(item => item.matchType === 'recipe').length,
        estimatedItems: estimatedItems.length,
        lastUpdate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Menu margin calculation error:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Margen-Berechnung' },
      { status: 500 }
    );
  }
}

// Get all menus with margin information
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const menus = await prisma.menu.findMany({
      where: { userId: user.id },
      include: {
        menuItems: {
          select: {
            name: true,
            price: true,
            cost: true,
            margin: true,
            marginPercent: true
          }
        }
      },
      orderBy: { lastMarginCalc: 'desc' }
    });

    const menusWithMargins = menus.map(menu => ({
      id: menu.id,
      name: menu.name,
      template: menu.template,
      totalMargin: menu.totalMargin || 0,
      avgMargin: menu.avgMargin || 0,
      lastMarginCalc: menu.lastMarginCalc,
      itemCount: menu.menuItems.length,
      hasMarginData: menu.lastMarginCalc !== null
    }));

    return NextResponse.json({ menus: menusWithMargins });

  } catch (error) {
    console.error('Menu margins fetch error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Margen-Daten' },
      { status: 500 }
    );
  }
}