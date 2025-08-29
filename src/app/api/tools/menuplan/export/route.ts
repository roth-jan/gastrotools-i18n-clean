import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { verifyAuth } from '@/lib/auth-utils';
import { checkUsageLimit } from '@/lib/usage-utils';
import jsPDF from 'jspdf';
import { startOfWeek, endOfWeek, addWeeks, format } from 'date-fns';
import { de } from 'date-fns/locale';

// GET: Export week plan as PDF
export async function GET(request: NextRequest) {
  try {
    // 1. Auth check
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const weekOffset = parseInt(searchParams.get('offset') || '0');

    // Calculate week dates
    const today = new Date();
    const targetDate = addWeeks(today, weekOffset);
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

    let menuPlans: any[] = [];
    let recipes: Map<string, any> = new Map();

    // Handle demo user
    if (user.id === 'demo-user-123') {
      // Generate demo data
      menuPlans = generateDemoMenuPlans(weekStart);
      recipes = getDemoRecipesMap();
    } else {
      // 2. Usage limit check for export
      const usage = await checkUsageLimit(user.id, 'exports');
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

      // Calculate week offset
      const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekDiff = Math.floor((weekStart.getTime() - currentWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
      
      // Fetch menu plans from database
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
      menuPlans = dbMenuPlans.map(plan => {
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

      // Create recipe map
      recipes = new Map();
      menuPlans.forEach(plan => {
        if (plan.recipe) {
          recipes.set(plan.recipe.id, plan.recipe);
        }
      });
    }

    // Create PDF
    const doc = new jsPDF();
    
    // Add custom fonts support for German characters
    doc.setFont('helvetica');
    
    // Title
    const weekNumber = format(weekStart, 'w', { locale: de });
    const year = weekStart.getFullYear();
    doc.setFontSize(24);
    doc.text(`Wochenplan KW ${weekNumber}/${year}`, 20, 25);
    
    // Subtitle with date range
    doc.setFontSize(14);
    const dateRange = `${format(weekStart, 'dd.MM.')} - ${format(weekEnd, 'dd.MM.yyyy')}`;
    doc.text(dateRange, 20, 35);
    
    // Restaurant name
    doc.setFontSize(16);
    doc.text(user.company || user.name || 'Mein Restaurant', 20, 45);
    
    // Week days and meals
    const weekDays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    const mealTypeMap: Record<string, string> = {
      'breakfast': 'Frühstück',
      'lunch': 'Mittagessen',
      'dinner': 'Abendessen',
    };
    
    let yPosition = 60;
    
    // Draw week plan
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(currentDate.getDate() + i);
      
      // Day header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`${weekDays[i]}, ${format(currentDate, 'dd.MM.')}`, 20, yPosition);
      yPosition += 10;
      
      // Meals for this day
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      const dayPlans = menuPlans.filter(
        (plan) => format(new Date(plan.date), 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd')
      );
      
      ['breakfast', 'lunch', 'dinner'].forEach((mealType) => {
        const plan = dayPlans.find((p) => (p.mealType || p.meal) === mealType);
        
        if (plan && plan.recipe) {
          const recipe = user.id === 'demo-user-123' 
            ? recipes.get(plan.recipeId) 
            : plan.recipe;
            
          const servingsText = plan.servings ? ` (${plan.servings} Portionen)` : '';
          const notesText = plan.notes ? ` - ${plan.notes}` : '';
          
          doc.setFont('helvetica', 'bold');
          doc.text(`${mealTypeMap[mealType]}:`, 30, yPosition);
          
          doc.setFont('helvetica', 'normal');
          doc.text(`${recipe.name}${servingsText}${notesText}`, 70, yPosition);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.text(`${mealTypeMap[mealType]}: -`, 30, yPosition);
        }
        
        yPosition += 7;
      });
      
      yPosition += 5;
      
      // New page if needed
      if (yPosition > 260 && i < 6) {
        doc.addPage();
        yPosition = 20;
      }
    }
    
    // Shopping list summary (if space permits)
    if (yPosition < 200) {
      yPosition += 10;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Zusammenfassung', 20, yPosition);
      yPosition += 8;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      const recipeCounts = new Map<string, number>();
      menuPlans.forEach(plan => {
        if (plan.recipe) {
          const key = plan.recipe.name;
          recipeCounts.set(key, (recipeCounts.get(key) || 0) + 1);
        }
      });
      
      recipeCounts.forEach((count, recipeName) => {
        doc.text(`• ${recipeName} (${count}x)`, 25, yPosition);
        yPosition += 6;
        if (yPosition > 260) return;
      });
    }
    
    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Erstellt mit GastroTools', 20, pageHeight - 15);
    doc.text(format(new Date(), 'dd.MM.yyyy HH:mm'), 150, pageHeight - 15);

    // Return PDF as blob
    const pdfBuffer = doc.output('arraybuffer');
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="wochenplan-kw${weekNumber}-${year}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error exporting week plan:', error);
    return NextResponse.json(
      { error: 'Failed to export week plan' },
      { status: 500 }
    );
  }
}

function getDemoRecipesMap() {
  const recipes = new Map();
  const demoRecipes = [
    { id: 'demo-1', name: 'Müsli mit frischen Früchten' },
    { id: 'demo-2', name: 'Vollkornbrot mit Avocado' },
    { id: 'demo-3', name: 'Porridge mit Beeren' },
    { id: 'demo-4', name: 'Caesar Salat' },
    { id: 'demo-5', name: 'Pasta Carbonara' },
    { id: 'demo-6', name: 'Gemüsesuppe' },
    { id: 'demo-7', name: 'Rindergulasch' },
    { id: 'demo-8', name: 'Lachsfilet mit Gemüse' },
    { id: 'demo-9', name: 'Hähnchencurry' },
  ];
  
  demoRecipes.forEach(recipe => {
    recipes.set(recipe.id, recipe);
  });
  
  return recipes;
}

function generateDemoMenuPlans(weekStart: Date) {
  const plans = [];
  const demoRecipes = ['demo-1', 'demo-2', 'demo-4', 'demo-5', 'demo-7', 'demo-8'];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    
    // Add some demo meals (Mon, Wed, Fri have meals)
    if (i % 2 === 0) {
      plans.push({
        date,
        mealType: 'breakfast',
        recipeId: demoRecipes[i % 2],
        recipe: { id: demoRecipes[i % 2], name: 'Demo Recipe' },
        servings: 4,
        notes: i === 0 ? 'Montag Start' : null,
      });
      
      plans.push({
        date,
        mealType: 'lunch',
        recipeId: demoRecipes[2 + (i % 2)],
        recipe: { id: demoRecipes[2 + (i % 2)], name: 'Demo Recipe' },
        servings: 6,
        notes: null,
      });
      
      if (i !== 6) {
        plans.push({
          date,
          mealType: 'dinner',
          recipeId: demoRecipes[4 + (i % 2)],
          recipe: { id: demoRecipes[4 + (i % 2)], name: 'Demo Recipe' },
          servings: 8,
          notes: 'Gäste erwartet',
        });
      }
    }
  }
  
  return plans;
}