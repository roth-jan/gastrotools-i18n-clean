import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth-utils';
import { AllergenDetector } from '@/lib/allergen-detector';

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

    const { recipeName, portions, ingredients } = await request.json();
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Special handling for demo user
    if (user.id === 'demo-user-123') {
      // Demo user has no usage limits
    } else {
      // Check usage limits for regular users
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
      if (user.plan === 'free' && usage.recipesCount >= 10) {
        // Create lead if first time hitting limit
        const existingLead = await prisma.lead.findFirst({
          where: {
            email: user.email,
            toolInterest: 'naehrwertrechner'
          }
        });

        if (!existingLead) {
          await prisma.lead.create({
            data: {
              email: user.email,
              name: user.name,
              company: user.company || '',
              phone: '',
              toolInterest: 'naehrwertrechner',
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
    }

    // Calculate nutrition
    const totalWeight = ingredients.reduce((sum: number, ing: any) => {
      const weight = ing.unit === 'ml' ? ing.amount : ing.amount;
      return sum + weight;
    }, 0);

    if (totalWeight === 0) {
      return NextResponse.json(
        { error: 'Keine Zutaten vorhanden' },
        { status: 400 }
      );
    }

    const factor = 100 / totalWeight;

    const nutrition = {
      energy: ingredients.reduce((sum: number, ing: any) => sum + (ing.energy * ing.amount / 100), 0) * factor,
      fat: ingredients.reduce((sum: number, ing: any) => sum + (ing.fat * ing.amount / 100), 0) * factor,
      saturatedFat: ingredients.reduce((sum: number, ing: any) => sum + (ing.saturatedFat * ing.amount / 100), 0) * factor,
      carbohydrates: ingredients.reduce((sum: number, ing: any) => sum + (ing.carbohydrates * ing.amount / 100), 0) * factor,
      sugar: ingredients.reduce((sum: number, ing: any) => sum + (ing.sugar * ing.amount / 100), 0) * factor,
      protein: ingredients.reduce((sum: number, ing: any) => sum + (ing.protein * ing.amount / 100), 0) * factor,
      salt: ingredients.reduce((sum: number, ing: any) => sum + (ing.salt * ing.amount / 100), 0) * factor
    };

    // Detect allergens
    const allergenDetector = new AllergenDetector();
    const ingredientNames = ingredients.map((ing: any) => ing.name).join(', ');
    const detectedAllergens = allergenDetector.detectAllergens(ingredientNames);

    // Handle demo user differently
    if (user.id === 'demo-user-123') {
      // For demo user, return calculated nutrition without saving to database
      return NextResponse.json({
        recipe: {
          id: `demo-recipe-${Date.now()}`,
          name: recipeName || 'Unbenanntes Rezept'
        },
        nutrition,
        allergens: detectedAllergens,
        usage: {
          current: 0,
          limit: 999 // No limit for demo
        }
      });
    }

    // Save recipe to database for regular users
    const recipe = await prisma.recipe.create({
      data: {
        userId: user.id,
        name: recipeName || 'Unbenanntes Rezept',
        portionSize: portions,
        ingredients: JSON.stringify(ingredients),
        nutrition: JSON.stringify({
          ...nutrition,
          allergens: detectedAllergens
        })
      }
    });

    // Get current usage for response
    const currentUsage = await prisma.usageTracking.findFirst({
      where: {
        userId: user.id,
        month: currentMonth
      }
    });

    // Update usage count
    if (currentUsage) {
      await prisma.usageTracking.update({
        where: { id: currentUsage.id },
        data: { recipesCount: currentUsage.recipesCount + 1 }
      });
    }

    return NextResponse.json({
      recipe: {
        id: recipe.id,
        name: recipe.name
      },
      nutrition,
      allergens: detectedAllergens,
      usage: {
        current: currentUsage ? currentUsage.recipesCount + 1 : 1,
        limit: 10
      }
    });

  } catch (error) {
    console.error('Nutrition calculation error:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Nährwertberechnung' },
      { status: 500 }
    );
  }
}