import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth-utils';

const prisma = new PrismaClient();

// Calculate weekly budget based on menu plan and recipe costs
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const body = await request.json();
    const { weekOffset = 0 } = body; // 0 = current week, 1 = next week, -1 = last week

    // Handle demo user specially
    if (user.id === 'demo-user-123') {
      return NextResponse.json({
        weekStart: new Date().toISOString(),
        weekOffset,
        message: 'Demo Budget-Berechnung erfolgreich',
        budget: {
          plannedTotalCost: 850.00,
          actualTotalCost: 920.50,
          plannedFoodCost: 680.00,
          actualFoodCost: 736.40,
          estimatedRevenue: 2761.50,
          targetMargin: 30,
          actualCostPercent: 26.7
        },
        dailyBreakdown: [
          { day: 'Montag', plannedCost: 120.00, actualCost: 130.50, foodCost: 104.40, mealCount: 2 },
          { day: 'Dienstag', plannedCost: 140.00, actualCost: 145.25, foodCost: 116.20, mealCount: 3 },
          { day: 'Mittwoch', plannedCost: 110.00, actualCost: 115.75, foodCost: 92.60, mealCount: 2 }
        ],
        insights: [
          { type: 'success', message: 'Wochenkosten unter Ziel: 26.7%' },
          { type: 'info', message: 'Demo-Daten für Präsentationszwecke' }
        ],
        statistics: {
          totalMealsPlanned: 7,
          recipesWithCosts: 3,
          recipesWithoutCosts: 4,
          avgCostPerMeal: 45.50
        }
      });
    }

    // Calculate week start (Monday)
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + daysToMonday + (weekOffset * 7));
    weekStart.setHours(0, 0, 0, 0);

    // Get menu plan for the week
    const menuPlans = await prisma.menuPlan.findMany({
      where: {
        userId: user.id,
        weekOffset: weekOffset
      },
      include: {
        recipe: {
          include: {
            ingredientCosts: true
          }
        }
      }
    });

    if (menuPlans.length === 0) {
      return NextResponse.json({
        weekStart: weekStart.toISOString(),
        weekOffset,
        message: 'Keine Menüplanung für diese Woche gefunden',
        budget: {
          plannedTotalCost: 0,
          actualTotalCost: 0,
          plannedFoodCost: 0,
          actualFoodCost: 0,
          estimatedRevenue: 0,
          targetMargin: 30
        },
        dailyBreakdown: []
      });
    }

    // Calculate costs for each planned meal
    let totalPlannedCost = 0;
    let totalActualCost = 0;
    let totalFoodCost = 0;
    const dailyBreakdown: any[] = [];

    // Group by day
    const dayGroups = menuPlans.reduce((groups, plan) => {
      if (!groups[plan.day]) {
        groups[plan.day] = [];
      }
      groups[plan.day].push(plan);
      return groups;
    }, {} as Record<string, typeof menuPlans>);

    const weekDays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

    for (const day of weekDays) {
      const dayPlans = dayGroups[day] || [];
      let dayPlannedCost = 0;
      let dayActualCost = 0;
      let dayFoodCost = 0;
      const dayMeals: any[] = [];

      for (const plan of dayPlans) {
        let mealCost = 0;
        let mealFoodCost = 0;
        let hasRecipeData = false;

        if (plan.recipe && plan.recipe.totalCost) {
          // Use recipe cost data
          const servings = plan.estimatedServings || 1;
          mealCost = (plan.recipe.costPerServing || plan.recipe.totalCost) * servings;
          mealFoodCost = mealCost; // All recipe costs are considered food costs
          hasRecipeData = true;
        } else if (plan.recipeName) {
          // Estimate cost for planned recipe without cost data
          // Average cost per serving estimation: 3-5€
          const servings = plan.estimatedServings || 1;
          mealCost = 4 * servings; // 4€ per serving estimate
          mealFoodCost = mealCost * 0.8; // 80% food cost estimate
        }

        dayPlannedCost += mealCost;
        dayActualCost += plan.actualCost || mealCost;
        dayFoodCost += mealFoodCost;

        dayMeals.push({
          meal: plan.meal,
          recipeName: plan.recipeName,
          plannedCost: Math.round(mealCost * 100) / 100,
          actualCost: Math.round((plan.actualCost || mealCost) * 100) / 100,
          estimatedServings: plan.estimatedServings || 1,
          hasRecipeData,
          recipeId: plan.recipeId
        });

        // Update the menu plan with calculated costs
        await prisma.menuPlan.update({
          where: { id: plan.id },
          data: {
            plannedCost: Math.round(mealCost * 100) / 100,
            actualCost: plan.actualCost || Math.round(mealCost * 100) / 100
          }
        });
      }

      totalPlannedCost += dayPlannedCost;
      totalActualCost += dayActualCost;
      totalFoodCost += dayFoodCost;

      dailyBreakdown.push({
        day,
        plannedCost: Math.round(dayPlannedCost * 100) / 100,
        actualCost: Math.round(dayActualCost * 100) / 100,
        foodCost: Math.round(dayFoodCost * 100) / 100,
        mealCount: dayPlans.length,
        meals: dayMeals
      });
    }

    // Estimate revenue (assuming 3x cost markup)
    const estimatedRevenue = totalActualCost * 3;
    const targetMargin = 30; // 30% cost target

    // Create or update weekly budget record
    const weeklyBudget = await prisma.weeklyBudget.upsert({
      where: {
        userId_weekOffset: {
          userId: user.id,
          weekOffset: weekOffset
        }
      },
      update: {
        weekStart,
        plannedTotalCost: Math.round(totalPlannedCost * 100) / 100,
        actualTotalCost: Math.round(totalActualCost * 100) / 100,
        plannedFoodCost: Math.round(totalFoodCost * 100) / 100,
        actualFoodCost: Math.round(totalFoodCost * 100) / 100,
        estimatedRevenue: Math.round(estimatedRevenue * 100) / 100,
        targetMargin
      },
      create: {
        userId: user.id,
        weekOffset,
        weekStart,
        plannedTotalCost: Math.round(totalPlannedCost * 100) / 100,
        actualTotalCost: Math.round(totalActualCost * 100) / 100,
        plannedFoodCost: Math.round(totalFoodCost * 100) / 100,
        actualFoodCost: Math.round(totalFoodCost * 100) / 100,
        estimatedRevenue: Math.round(estimatedRevenue * 100) / 100,
        targetMargin
      }
    });

    // Generate insights
    const insights = [];
    const actualCostPercent = estimatedRevenue > 0 ? (totalActualCost / estimatedRevenue) * 100 : 0;

    if (actualCostPercent > targetMargin) {
      insights.push({
        type: 'warning',
        message: `Wochenkosten bei ${actualCostPercent.toFixed(1)}% - Ziel: ${targetMargin}%`
      });
    } else {
      insights.push({
        type: 'success',
        message: `Wochenkosten unter Ziel: ${actualCostPercent.toFixed(1)}%`
      });
    }

    const recipesWithoutCosts = menuPlans.filter(plan => plan.recipe && !plan.recipe.totalCost).length;
    if (recipesWithoutCosts > 0) {
      insights.push({
        type: 'info',
        message: `${recipesWithoutCosts} Rezepte ohne Kostendaten - Berechnen Sie Rezeptkosten für genauere Budgets`
      });
    }

    const plannedMeals = menuPlans.length;
    const totalPossibleMeals = 21; // 7 days × 3 meals
    if (plannedMeals < totalPossibleMeals * 0.5) {
      insights.push({
        type: 'info',
        message: `Nur ${plannedMeals} von ${totalPossibleMeals} möglichen Mahlzeiten geplant`
      });
    }

    return NextResponse.json({
      weekStart: weekStart.toISOString(),
      weekOffset,
      budget: {
        plannedTotalCost: Math.round(totalPlannedCost * 100) / 100,
        actualTotalCost: Math.round(totalActualCost * 100) / 100,
        plannedFoodCost: Math.round(totalFoodCost * 100) / 100,
        actualFoodCost: Math.round(totalFoodCost * 100) / 100,
        estimatedRevenue: Math.round(estimatedRevenue * 100) / 100,
        targetMargin,
        actualCostPercent: Math.round(actualCostPercent * 10) / 10
      },
      dailyBreakdown,
      insights,
      statistics: {
        totalMealsPlanned: plannedMeals,
        recipesWithCosts: menuPlans.filter(plan => plan.recipe?.totalCost).length,
        recipesWithoutCosts,
        avgCostPerMeal: plannedMeals > 0 ? Math.round((totalActualCost / plannedMeals) * 100) / 100 : 0
      }
    });

  } catch (error) {
    console.error('Week budget calculation error:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Budget-Berechnung' },
      { status: 500 }
    );
  }
}

// Get weekly budget summaries for multiple weeks
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const budgets = await prisma.weeklyBudget.findMany({
      where: { userId: user.id },
      orderBy: { weekStart: 'desc' },
      take: 12 // Last 12 weeks
    });

    const budgetSummaries = budgets.map(budget => ({
      weekOffset: budget.weekOffset,
      weekStart: budget.weekStart.toISOString(),
      weekLabel: `KW ${getWeekNumber(budget.weekStart)} ${budget.weekStart.getFullYear()}`,
      plannedTotalCost: budget.plannedTotalCost,
      actualTotalCost: budget.actualTotalCost,
      estimatedRevenue: budget.estimatedRevenue,
      actualCostPercent: budget.estimatedRevenue > 0 ? 
        Math.round((budget.actualTotalCost / budget.estimatedRevenue) * 100 * 10) / 10 : 0,
      targetMargin: budget.targetMargin,
      onTarget: budget.estimatedRevenue > 0 ? 
        (budget.actualTotalCost / budget.estimatedRevenue) * 100 <= budget.targetMargin : false
    }));

    return NextResponse.json({ budgets: budgetSummaries });

  } catch (error) {
    console.error('Week budgets fetch error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Budget-Daten' },
      { status: 500 }
    );
  }
}

// Helper function to get week number
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}