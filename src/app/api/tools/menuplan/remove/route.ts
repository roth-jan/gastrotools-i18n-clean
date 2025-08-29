import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { verifyAuth } from '@/lib/auth-utils';

// In-memory storage for demo user
const demoMenuPlans = new Map<string, any>();

// DELETE: Remove recipe from meal slot
export async function DELETE(request: NextRequest) {
  try {
    // 1. Auth check
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { date, mealType } = data;

    if (!date || !mealType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Handle demo user
    if (user.id === 'demo-user-123') {
      const key = `${date}-${mealType}`;
      demoMenuPlans.delete(key);
      return NextResponse.json({ 
        success: true,
        message: 'Demo meal plan removed successfully',
      });
    }

    // Extract day name from date and calculate week offset
    const dateObj = new Date(date);
    const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const dayName = dayNames[dateObj.getDay()];
    
    // Calculate week offset
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    const weekDiff = Math.floor((dateObj.getTime() - startOfWeek.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    // Find and delete the menu plan
    const menuPlan = await prisma.menuPlan.findFirst({
      where: {
        userId: user.id,
        day: dayName,
        meal: mealType,
        weekOffset: weekDiff,
      },
    });

    if (!menuPlan) {
      return NextResponse.json(
        { error: 'Menu plan not found' },
        { status: 404 }
      );
    }

    await prisma.menuPlan.delete({
      where: { id: menuPlan.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Menu plan removed successfully',
    });

  } catch (error) {
    console.error('Error removing recipe:', error);
    return NextResponse.json(
      { error: 'Failed to remove recipe' },
      { status: 500 }
    );
  }
}

// POST: Alternative method for removing (some clients prefer POST over DELETE)
export async function POST(request: NextRequest) {
  return DELETE(request);
}