import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth-utils';
import { checkUsageLimit, incrementUsage } from '@/lib/usage-utils';

const prisma = new PrismaClient();

// GET cost entries with filters
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const categoryId = searchParams.get('categoryId');

    // For demo user, return simple demo data
    if (user.id === 'demo-user-123') {
      const demoEntries = [
        {
          id: '1',
          date: new Date().toISOString(),
          categoryId: '1',
          category: { name: 'Lebensmittel', color: '#10b981', icon: '🥘' },
          amount: 450.50,
          description: 'Großeinkauf Gemüse & Fleisch',
          supplier: 'Metro'
        },
        {
          id: '2',
          date: new Date(Date.now() - 86400000).toISOString(),
          categoryId: '2',
          category: { name: 'Personal', color: '#3b82f6', icon: '👥' },
          amount: 1200.00,
          description: 'Gehälter Teilzeit',
          supplier: null
        },
        {
          id: '3',
          date: new Date(Date.now() - 172800000).toISOString(),
          categoryId: '1',
          category: { name: 'Lebensmittel', color: '#10b981', icon: '🥘' },
          amount: 320.75,
          description: 'Frischware Wochenmarkt',
          supplier: 'Bauernmarkt'
        }
      ];

      return NextResponse.json({ 
        entries: demoEntries,
        total: demoEntries.reduce((sum, e) => sum + e.amount, 0)
      });
    }

    // Build query filters
    const where: any = { userId: user.id };
    
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Get entries
    const entries = await prisma.costEntry.findMany({
      where,
      include: {
        category: {
          select: { name: true, color: true, icon: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    // Calculate total
    const total = entries.reduce((sum, entry) => sum + entry.amount, 0);

    return NextResponse.json({ entries, total });

  } catch (error) {
    console.error('Entries fetch error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Einträge' },
      { status: 500 }
    );
  }
}

// POST new cost entry
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    // Check usage limit
    const usage = await checkUsageLimit(user.id, 'costEntries');
    if (usage.exceeded && user.id !== 'demo-user-123') {
      return NextResponse.json({ 
        error: 'Monatliches Limit erreicht',
        showLeadCapture: true,
        limit: usage.limit,
        used: usage.used
      }, { status: 429 });
    }

    const body = await request.json();
    const { categoryId, date, amount, description, supplier, invoiceNo, isRecurring, recurringDay } = body;

    if (!categoryId || !date || !amount) {
      return NextResponse.json(
        { error: 'Kategorie, Datum und Betrag sind erforderlich' },
        { status: 400 }
      );
    }

    // Handle demo user - simple success response  
    if (user.id === 'demo-user-123') {
      // For demo: just return success (no real persistence needed for demo)
      const demoEntry = {
        id: Date.now().toString(),
        date: new Date(date).toISOString(),
        categoryId,
        category: { name: 'Demo Category', color: '#10b981', icon: '🥘' },
        amount: parseFloat(amount),
        description,
        supplier
      };
      
      return NextResponse.json({ 
        entry: demoEntry,
        success: true
      });
    }

    // Create entry
    const entry = await prisma.costEntry.create({
      data: {
        userId: user.id,
        categoryId,
        date: new Date(date),
        amount: parseFloat(amount),
        description,
        supplier,
        invoiceNo,
        isRecurring: isRecurring || false,
        recurringDay: recurringDay || null
      },
      include: {
        category: {
          select: { name: true, color: true, icon: true }
        }
      }
    });

    // Update usage
    await incrementUsage(user.id, 'costEntries');

    return NextResponse.json({ entry });

  } catch (error) {
    console.error('Entry creation error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Eintrags' },
      { status: 500 }
    );
  }
}

// DELETE cost entry
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID erforderlich' }, { status: 400 });
    }

    // Handle demo user - simple success response
    if (user.id === 'demo-user-123') {
      // For demo: just return success (no real persistence needed)
      return NextResponse.json({ 
        success: true,
        message: 'Demo-Eintrag gelöscht'
      });
    }

    // Verify ownership
    const entry = await prisma.costEntry.findFirst({
      where: { id, userId: user.id }
    });

    if (!entry) {
      return NextResponse.json({ error: 'Eintrag nicht gefunden' }, { status: 404 });
    }

    await prisma.costEntry.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Entry deletion error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Eintrags' },
      { status: 500 }
    );
  }
}