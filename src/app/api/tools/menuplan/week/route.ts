import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth-utils';
import { startOfWeek, endOfWeek, addWeeks, format } from 'date-fns';
import { de } from 'date-fns/locale';

const prisma = new PrismaClient();

// GET: Fetch week plan
export async function GET(request: NextRequest) {
  try {
    // 1. Auth check
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get week offset from query params (0 = current week, 1 = next week, etc.)
    const searchParams = request.nextUrl.searchParams;
    const weekOffset = parseInt(searchParams.get('offset') || '0');
    
    // Calculate week start and end dates
    const today = new Date();
    const targetDate = addWeeks(today, weekOffset);
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

    // Handle demo user
    if (user.id === 'demo-user-123') {
      // Return demo menu plan
      const demoMenuPlan = {
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        weekNumber: format(weekStart, 'w', { locale: de }),
        year: weekStart.getFullYear(),
        days: generateDemoWeekPlan(weekStart),
        availableRecipes: getDemoRecipes(),
      };
      return NextResponse.json(demoMenuPlan);
    }

    // Calculate week offset
    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekDiff = Math.floor((weekStart.getTime() - currentWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    // Fetch menu plan for the week
    const dbMenuPlans = await prisma.menuPlan.findMany({
      where: {
        userId: user.id,
        weekOffset: weekDiff,
      },
      include: {
        recipe: true,
      },
    });
    
    // Convert to the expected format with dates
    const menuPlans = dbMenuPlans.map(plan => {
      const dayIndex = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'].indexOf(plan.day);
      const date = new Date(weekStart);
      date.setDate(date.getDate() + dayIndex);
      
      return {
        ...plan,
        date,
        mealType: plan.meal,
        servings: plan.estimatedServings,
      };
    });

    // Get user's recipes for selection
    const recipes = await prisma.recipe.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        category: true,
        time: true,
        portions: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Build week plan with all days
    const weekPlan = {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      weekNumber: format(weekStart, 'w', { locale: de }),
      year: weekStart.getFullYear(),
      days: buildWeekPlan(weekStart, menuPlans),
      availableRecipes: recipes,
    };

    return NextResponse.json(weekPlan);
  } catch (error) {
    console.error('Error fetching week plan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch week plan' },
      { status: 500 }
    );
  }
}

function buildWeekPlan(weekStart: Date, menuPlans: any[]) {
  const days = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    
    const dayPlans = menuPlans.filter(
      (plan) => format(new Date(plan.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    
    days.push({
      date: date.toISOString(),
      dayName: format(date, 'EEEE', { locale: de }),
      dayNumber: format(date, 'd'),
      monthName: format(date, 'MMMM', { locale: de }),
      meals: {
        breakfast: dayPlans.find((p) => p.mealType === 'breakfast') || null,
        lunch: dayPlans.find((p) => p.mealType === 'lunch') || null,
        dinner: dayPlans.find((p) => p.mealType === 'dinner') || null,
      },
    });
  }
  
  return days;
}

function getDemoRecipes() {
  return [
    { id: 'demo-1', name: 'Müsli mit frischen Früchten', category: 'breakfast', prepTime: 10, servings: 1 },
    { id: 'demo-2', name: 'Vollkornbrot mit Avocado', category: 'breakfast', prepTime: 15, servings: 2 },
    { id: 'demo-3', name: 'Porridge mit Beeren', category: 'breakfast', prepTime: 15, servings: 2 },
    { id: 'demo-4', name: 'Caesar Salat', category: 'lunch', prepTime: 20, servings: 2 },
    { id: 'demo-5', name: 'Pasta Carbonara', category: 'lunch', prepTime: 30, servings: 4 },
    { id: 'demo-6', name: 'Gemüsesuppe', category: 'lunch', prepTime: 40, servings: 6 },
    { id: 'demo-7', name: 'Rindergulasch', category: 'dinner', prepTime: 120, servings: 6 },
    { id: 'demo-8', name: 'Lachsfilet mit Gemüse', category: 'dinner', prepTime: 45, servings: 2 },
    { id: 'demo-9', name: 'Hähnchencurry', category: 'dinner', prepTime: 60, servings: 4 },
  ];
}

function generateDemoWeekPlan(weekStart: Date) {
  const demoRecipes = getDemoRecipes();
  const days = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    
    // Add some meals for demo (not all slots filled)
    const meals: any = {
      breakfast: null,
      lunch: null,
      dinner: null,
    };
    
    // Add some demo meals (Mon, Wed, Fri have meals)
    if (i % 2 === 0) {
      meals.breakfast = {
        id: `demo-plan-${i}-breakfast`,
        recipeId: demoRecipes[i % 3].id,
        recipe: demoRecipes[i % 3],
        servings: 4,
        notes: 'Demo Notiz',
        mealType: 'breakfast',
        date: date.toISOString(),
      };
      meals.lunch = {
        id: `demo-plan-${i}-lunch`,
        recipeId: demoRecipes[3 + (i % 3)].id,
        recipe: demoRecipes[3 + (i % 3)],
        servings: 6,
        notes: null,
        mealType: 'lunch',
        date: date.toISOString(),
      };
      if (i !== 6) { // Not Sunday
        meals.dinner = {
          id: `demo-plan-${i}-dinner`,
          recipeId: demoRecipes[6 + (i % 3)].id,
          recipe: demoRecipes[6 + (i % 3)],
          servings: 8,
          notes: 'Gäste erwartet',
          mealType: 'dinner',
          date: date.toISOString(),
        };
      }
    }
    
    days.push({
      date: date.toISOString(),
      dayName: format(date, 'EEEE', { locale: de }),
      dayNumber: format(date, 'd'),
      monthName: format(date, 'MMMM', { locale: de }),
      meals,
    });
  }
  
  return days;
}