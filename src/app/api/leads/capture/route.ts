import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendLeadNotification } from '@/lib/email-service';
import { leadCaptureLimit, addRateLimitHeaders } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  // Rate limiting check
  const rateLimitResult = leadCaptureLimit(request);
  
  if (!rateLimitResult.allowed) {
    logger.warn('Lead capture rate limit exceeded', {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      remaining: rateLimitResult.remaining,
      component: 'rate-limiting'
    });
    
    const response = NextResponse.json(
      { 
        error: 'Zu viele Anfragen. Bitte versuchen Sie es in ein paar Minuten erneut.',
        rateLimitExceeded: true 
      },
      { status: 429 }
    );
    
    return addRateLimitHeaders(response, rateLimitResult);
  }

  try {
    const { 
      email, 
      name, 
      company, 
      phone, 
      currentTool,
      interestedInPremium,
      targetProduct,
      demoRequest,
      sourceTool,
      message,
      userId 
    } = await request.json();

    // Validierung
    if (!email || !name || !company) {
      return NextResponse.json(
        { error: 'Email, Name und Firma sind erforderlich' },
        { status: 400 }
      );
    }

    // Create lead with cross-sell data
    const lead = await prisma.lead.create({
      data: {
        email,
        name,
        company,
        phone,
        toolInterest: targetProduct || currentTool,
        message: message || (demoRequest ? `Demo-Anfrage für ${targetProduct}` : `Interesse an ${targetProduct} von ${sourceTool || currentTool}`),
        interestedInPremium: !!targetProduct,
        userId,
        source: targetProduct ? 'cross_sell_interest' : 'freemium_limit_reached',
        status: 'new',
        // Add cross-sell specific fields (these would need to be added to schema)
        metadata: JSON.stringify({
          sourceTool: sourceTool || currentTool,
          targetProduct,
          demoRequest: !!demoRequest,
          crossSellType: targetProduct ? 'separate_product' : 'upgrade'
        })
      }
    });

    // Send email notification to sales team
    await sendLeadNotification({
      lead: {
        name,
        email,
        company,
        phone,
        toolInterest: targetProduct || currentTool,
        message: message || (demoRequest ? `Demo-Anfrage für ${targetProduct}` : `Interesse an ${targetProduct} von ${sourceTool || currentTool}`)
      }
    });

    // If user is logged in, mark as contacted
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { 
          leadCaptured: true,
          leadCapturedAt: new Date()
        }
      });
    }

    const responseMessage = demoRequest 
      ? `Vielen Dank für Ihr Interesse an der ${targetProduct} Demo! Unser Team meldet sich innerhalb von 24 Stunden bei Ihnen.`
      : targetProduct 
        ? `Vielen Dank für Ihr Interesse an ${targetProduct}! Unser Vertriebsteam meldet sich innerhalb von 24 Stunden bei Ihnen.`
        : 'Vielen Dank für Ihr Interesse! Unser Vertriebsteam meldet sich innerhalb von 24 Stunden bei Ihnen.';

    const response = NextResponse.json({
      success: true,
      message: responseMessage,
      leadId: lead.id
    });
    
    return addRateLimitHeaders(response, rateLimitResult);

  } catch (error) {
    console.error('Lead capture error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Speichern Ihrer Anfrage' },
      { status: 500 }
    );
  }
}