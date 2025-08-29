import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth-utils';

const prisma = new PrismaClient();

// Calculate recipe costs based on ingredient costs from cost control
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const body = await request.json();
    const { recipeId } = body;

    if (!recipeId) {
      return NextResponse.json({ error: 'Recipe ID erforderlich' }, { status: 400 });
    }

    // Handle demo user
    if (user.id === 'demo-user-123') {
      // Return sample cost data for demo
      return NextResponse.json({
        totalCost: 12.50,
        costPerServing: 3.13,
        ingredients: [
          { name: 'Tomaten', amount: 500, unit: 'g', costPerUnit: 2.50, totalCost: 1.25 },
          { name: 'Olivenöl', amount: 30, unit: 'ml', costPerUnit: 12.00, totalCost: 0.36 },
        ],
        calculation: {
          method: 'Demo-Kalkulation',
          lastUpdate: new Date().toISOString(),
          accuracy: 'Demo-Daten für Testzwecke'
        }
      });
    }

    // Get recipe with ingredients
    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, userId: user.id }
    });

    if (!recipe) {
      return NextResponse.json({ error: 'Rezept nicht gefunden' }, { status: 404 });
    }

    const ingredients = recipe.ingredients as any[];
    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json({ error: 'Keine Zutaten im Rezept' }, { status: 400 });
    }

    // Get latest food costs from cost entries (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const foodCategory = await prisma.costCategory.findFirst({
      where: { 
        userId: user.id, 
        name: { contains: 'Lebensmittel' }
      }
    });

    if (!foodCategory) {
      return NextResponse.json({ 
        error: 'Lebensmittel-Kategorie nicht gefunden',
        suggestion: 'Bitte erstellen Sie zuerst Kosteneinträge für Lebensmittel'
      }, { status: 400 });
    }

    // Get recent food cost entries
    const costEntries = await prisma.costEntry.findMany({
      where: {
        userId: user.id,
        categoryId: foodCategory.id,
        date: { gte: thirtyDaysAgo }
      },
      orderBy: { date: 'desc' }
    });

    let totalRecipeCost = 0;
    const calculatedIngredients = [];

    // Calculate cost for each ingredient
    for (const ingredient of ingredients) {
      const ingredientName = ingredient.name?.toLowerCase() || '';
      const amount = ingredient.amount || 0;
      const unit = ingredient.unit || 'g';

      // Try to match ingredient with cost entries (fuzzy matching)
      const matchingCostEntry = costEntries.find(entry => 
        entry.description?.toLowerCase().includes(ingredientName) ||
        ingredientName.includes(entry.description?.toLowerCase().split(' ')[0] || '')
      );

      let costPerUnit = 0;
      let totalIngredientCost = 0;

      if (matchingCostEntry) {
        // Estimate cost per unit (simplified calculation)
        // This is a basic approach - in reality you'd want more sophisticated matching
        costPerUnit = matchingCostEntry.amount / 1000; // Assume 1kg = 1000g for rough estimate
        totalIngredientCost = (amount * costPerUnit);
      } else {
        // Use average food cost if no specific match
        const avgCostPerKg = costEntries.reduce((sum, entry) => sum + entry.amount, 0) / Math.max(costEntries.length, 1) / 1000;
        costPerUnit = avgCostPerKg;
        totalIngredientCost = (amount * costPerUnit);
      }

      totalRecipeCost += totalIngredientCost;

      calculatedIngredients.push({
        name: ingredient.name,
        amount,
        unit,
        costPerUnit: Math.round(costPerUnit * 100) / 100,
        totalCost: Math.round(totalIngredientCost * 100) / 100,
        hasExactMatch: !!matchingCostEntry
      });

      // Save/update ingredient cost record
      await prisma.ingredientCost.upsert({
        where: {
          recipeId_ingredient: {
            recipeId: recipe.id,
            ingredient: ingredient.name
          }
        },
        update: {
          amount,
          unit,
          costPerUnit: Math.round(costPerUnit * 100) / 100,
          totalCost: Math.round(totalIngredientCost * 100) / 100
        },
        create: {
          userId: user.id,
          recipeId: recipe.id,
          ingredient: ingredient.name,
          amount,
          unit,
          costPerUnit: Math.round(costPerUnit * 100) / 100,
          totalCost: Math.round(totalIngredientCost * 100) / 100
        }
      });
    }

    const costPerServing = totalRecipeCost / (parseFloat(recipe.portions || '1') || 1);

    // Update recipe with calculated costs
    await prisma.recipe.update({
      where: { id: recipe.id },
      data: {
        totalCost: Math.round(totalRecipeCost * 100) / 100,
        costPerServing: Math.round(costPerServing * 100) / 100,
        lastCostUpdate: new Date()
      }
    });

    return NextResponse.json({
      recipeId: recipe.id,
      recipeName: recipe.name,
      totalCost: Math.round(totalRecipeCost * 100) / 100,
      costPerServing: Math.round(costPerServing * 100) / 100,
      servings: parseFloat(recipe.portions || '1'),
      ingredients: calculatedIngredients,
      calculation: {
        basedOnEntries: costEntries.length,
        dateRange: `${thirtyDaysAgo.toISOString().split('T')[0]} bis heute`,
        lastUpdate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Recipe cost calculation error:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Rezeptkosten-Berechnung' },
      { status: 500 }
    );
  }
}

// Get all recipes with cost information
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const recipes = await prisma.recipe.findMany({
      where: { userId: user.id },
      include: {
        ingredientCosts: true
      },
      orderBy: { lastCostUpdate: 'desc' }
    });

    const recipesWithCosts = recipes.map(recipe => ({
      id: recipe.id,
      name: recipe.name,
      category: recipe.category,
      totalCost: recipe.totalCost || 0,
      costPerServing: recipe.costPerServing || 0,
      lastCostUpdate: recipe.lastCostUpdate,
      hasCostData: recipe.ingredientCosts.length > 0,
      ingredientCount: recipe.ingredientCosts.length
    }));

    return NextResponse.json({ recipes: recipesWithCosts });

  } catch (error) {
    console.error('Recipe costs fetch error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Rezeptkosten' },
      { status: 500 }
    );
  }
}