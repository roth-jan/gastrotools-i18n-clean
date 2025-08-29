import { NextRequest, NextResponse } from 'next/server';
import { usdaService } from '@/lib/usda-nutrition';
import { verifyAuth } from '@/lib/auth-utils';

// POST /api/nutrition/search
export async function POST(request: NextRequest) {
  try {
    // Auth-Check
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, limit = 5 } = await request.json();

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Suchanfrage muss mindestens 2 Zeichen lang sein' },
        { status: 400 }
      );
    }

    // USDA-Suche durchführen
    const results = await usdaService.searchIngredient(query.trim(), limit);

    return NextResponse.json({
      success: true,
      query,
      results,
      count: results.length,
      source: 'USDA Food Data Central',
      disclaimer: 'Nährwerte basieren auf USDA Food Data Central. Restaurant ist für finale Überprüfung verantwortlich.',
      legal_notice: 'Bei Allergien oder speziellen Diäten ärztlichen Rat einholen.'
    });

  } catch (error) {
    console.error('Nutrition search error:', error);
    
    return NextResponse.json(
      { 
        error: 'Fehler bei der Nährwert-Suche',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/nutrition/search?q=tomate&limit=5
export async function GET(request: NextRequest) {
  try {
    // Auth-Check
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '5');

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Parameter "q" erforderlich (min. 2 Zeichen)' },
        { status: 400 }
      );
    }

    // USDA-Suche durchführen
    const results = await usdaService.searchIngredient(query.trim(), limit);

    return NextResponse.json({
      success: true,
      query,
      results,
      count: results.length,
      source: 'USDA Food Data Central',
      api_status: await usdaService.validateApiKey() ? 'live' : 'demo',
      disclaimer: 'Nährwerte basieren auf USDA Food Data Central. Restaurant ist für finale Überprüfung verantwortlich.'
    });

  } catch (error) {
    console.error('Nutrition GET error:', error);
    
    return NextResponse.json(
      { 
        error: 'Fehler bei der Nährwert-Suche',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}