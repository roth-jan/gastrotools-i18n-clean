import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { verifyAuth } from '@/lib/auth-utils';
import { checkUsageLimit, incrementUsage } from '@/lib/usage-utils';
import { parse } from 'date-fns';

// In-memory storage for demo user
const demoMenuPlans = new Map<string, any>();

// POST: Assign recipe to meal slot
export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { date, mealType, recipeId, servings, notes } = data;

    if (!date || !mealType || !recipeId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate meal type
    if (!['breakfast', 'lunch', 'dinner'].includes(mealType)) {
      return NextResponse.json(
        { error: 'Invalid meal type' },
        { status: 400 }
      );
    }

    // Handle demo user
    if (user.id === 'demo-user-123') {
      const key = `${date}-${mealType}`;
      demoMenuPlans.set(key, {
        id: `demo-${key}`,
        date,
        mealType,
        recipeId,
        servings: servings || 4,
        notes,
      });
      return NextResponse.json({ 
        success: true,
        message: 'Demo meal plan assigned successfully',
      });
    }

    // 2. Usage limit check - Menu planning is tracked under recipes
    const usage = await checkUsageLimit(user.id, 'recipes');
    if (usage.exceeded) {
      return NextResponse.json(
        { 
          error: 'Usage limit exceeded',
          showLeadCapture: true,
          limit: usage.limit,
          used: usage.used,
        },
        { status: 429 }
      );
    }

    // Get recipe details first
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
    });
    
    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }
    
    // Extract day name from date
    const dateObj = new Date(date);
    const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const dayName = dayNames[dateObj.getDay()];
    
    // Calculate week offset
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    const weekDiff = Math.floor((dateObj.getTime() - startOfWeek.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    // Check if meal slot already has an assignment
    const existingPlan = await prisma.menuPlan.findFirst({
      where: {
        userId: user.id,
        day: dayName,
        meal: mealType,
        weekOffset: weekDiff,
      },
    });

    let menuPlan;

    if (existingPlan) {
      // Update existing assignment
      menuPlan = await prisma.menuPlan.update({
        where: { id: existingPlan.id },
        data: {
          recipeId,
          estimatedServings: servings || existingPlan.estimatedServings,
          notes,
        },
        include: {
          recipe: true,
        },
      });
    } else {
      // Create new assignment
      menuPlan = await prisma.menuPlan.create({
        data: {
          userId: user.id,
          day: dayName,
          meal: mealType,
          weekOffset: weekDiff,
          recipeId,
          recipeName: recipe ? recipe.name : null,
          estimatedServings: servings || 4,
          notes,
        },
        include: {
          recipe: true,
        },
      });

      // 4. Update usage only for new assignments
      await incrementUsage(user.id, 'recipes');
    }

    return NextResponse.json({
      success: true,
      menuPlan,
    });

  } catch (error) {
    console.error('Error assigning recipe:', error);
    return NextResponse.json(
      { error: 'Failed to assign recipe' },
      { status: 500 }
    );
  }
}