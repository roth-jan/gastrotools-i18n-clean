import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth-utils';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'month'; // day, week, month
    
    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        startDate = new Date(now.setDate(diff));
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // For demo user, return sample analytics
    if (user.id === 'demo-user-123') {
      return NextResponse.json({
        period,
        totalCosts: 4250.75,
        totalRevenue: 12500.00, // Assumed revenue
        costPercentage: 34.0,
        categoryBreakdown: [
          { name: 'Lebensmittel', amount: 1850.50, percentage: 43.5, color: '#10b981' },
          { name: 'Personal', amount: 1200.00, percentage: 28.2, color: '#3b82f6' },
          { name: 'Miete', amount: 800.00, percentage: 18.8, color: '#6366f1' },
          { name: 'Energie', amount: 250.25, percentage: 5.9, color: '#f59e0b' },
          { name: 'Marketing', amount: 100.00, percentage: 2.4, color: '#ec4899' },
          { name: 'Sonstiges', amount: 50.00, percentage: 1.2, color: '#6b7280' }
        ],
        trend: [
          { date: '2024-01-15', amount: 380.50 },
          { date: '2024-01-16', amount: 420.75 },
          { date: '2024-01-17', amount: 395.00 },
          { date: '2024-01-18', amount: 450.50 },
          { date: '2024-01-19', amount: 510.25 },
          { date: '2024-01-20', amount: 480.00 }
        ],
        targets: {
          overall: { target: 30, actual: 34.0, status: 'warning' },
          food: { target: 30, actual: 14.8, status: 'good' },
          labor: { target: 30, actual: 9.6, status: 'good' }
        },
        insights: [
          { type: 'warning', message: 'Ihre Gesamtkosten liegen 4% über dem Ziel' },
          { type: 'success', message: 'Lebensmittelkosten sind 15% niedriger als letzten Monat' },
          { type: 'info', message: 'Tipp: Reduzieren Sie Energiekosten durch LED-Beleuchtung' }
        ]
      });
    }

    // Get actual data
    const entries = await prisma.costEntry.findMany({
      where: {
        userId: user.id,
        date: { gte: startDate }
      },
      include: {
        category: true
      }
    });

    // Calculate totals by category
    const categoryTotals = entries.reduce((acc, entry) => {
      const catName = entry.category.name;
      if (!acc[catName]) {
        acc[catName] = {
          name: catName,
          amount: 0,
          color: entry.category.color || '#6b7280',
          type: entry.category.type
        };
      }
      acc[catName].amount += entry.amount;
      return acc;
    }, {} as Record<string, any>);

    const totalCosts = Object.values(categoryTotals).reduce((sum: number, cat: any) => sum + cat.amount, 0);
    
    // Calculate percentages
    const categoryBreakdown = Object.values(categoryTotals).map((cat: any) => ({
      ...cat,
      percentage: totalCosts > 0 ? (cat.amount / totalCosts) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);

    // Get targets
    const targets = await prisma.costTarget.findMany({
      where: {
        userId: user.id,
        period: period,
        isActive: true
      },
      include: {
        category: true
      }
    });

    // Calculate target status
    const assumedRevenue = totalCosts * 3; // Rough estimate
    const costPercentage = assumedRevenue > 0 ? (totalCosts / assumedRevenue) * 100 : 0;

    const targetStatus = targets.map(target => {
      const actual = target.category 
        ? (categoryTotals[target.category.name]?.amount || 0) / assumedRevenue * 100
        : costPercentage;
      
      return {
        name: target.category?.name || 'Gesamt',
        target: target.targetValue,
        actual: Math.round(actual * 10) / 10,
        status: actual > target.targetValue ? 'warning' : 'good'
      };
    });

    // Generate trend data (last 7 days)
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const dayEntries = entries.filter(e => {
        const entryDate = new Date(e.date);
        return entryDate.toDateString() === date.toDateString();
      });
      
      trend.push({
        date: date.toISOString().split('T')[0],
        amount: dayEntries.reduce((sum, e) => sum + e.amount, 0)
      });
    }

    // Generate insights
    const insights = [];
    if (costPercentage > 35) {
      insights.push({
        type: 'warning',
        message: `Ihre Gesamtkosten liegen bei ${costPercentage.toFixed(1)}% - Ziel sind 30%`
      });
    }
    
    const foodCosts = categoryTotals['Lebensmittel']?.amount || 0;
    const foodPercentage = assumedRevenue > 0 ? (foodCosts / assumedRevenue) * 100 : 0;
    if (foodPercentage < 30) {
      insights.push({
        type: 'success',
        message: `Lebensmittelkosten bei nur ${foodPercentage.toFixed(1)}% - sehr gut!`
      });
    }

    return NextResponse.json({
      period,
      totalCosts,
      totalRevenue: assumedRevenue,
      costPercentage,
      categoryBreakdown,
      trend,
      targets: {
        overall: targetStatus.find(t => t.name === 'Gesamt') || { target: 30, actual: costPercentage, status: costPercentage > 30 ? 'warning' : 'good' },
        food: targetStatus.find(t => t.name === 'Lebensmittel'),
        labor: targetStatus.find(t => t.name === 'Personal')
      },
      insights
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Analysen' },
      { status: 500 }
    );
  }
}