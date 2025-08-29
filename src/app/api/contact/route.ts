import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company, phone, subject, message } = body;

    // Validierung
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Pflichtfelder fehlen' },
        { status: 400 }
      );
    }

    // Lead in Datenbank speichern
    const lead = await prisma.lead.create({
      data: {
        email,
        name,
        company: company || '',
        phone,
        message: `Betreff: ${subject}\n\nNachricht: ${message}`,
        source: 'contact_form',
        interestedInPremium: true,
        toolInterest: 'Kontaktformular'
      }
    });

    // In Production würde hier eine E-Mail gesendet werden
    console.log('Neue Kontaktanfrage:', {
      name,
      email,
      company,
      subject
    });

    return NextResponse.json({ 
      success: true,
      message: 'Nachricht erfolgreich gesendet'
    });

  } catch (error) {
    console.error('Fehler beim Speichern der Kontaktanfrage:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}