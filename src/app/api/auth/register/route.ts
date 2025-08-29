import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, company, businessName, contactPerson, phone } = await request.json();

    // Validierung
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, Passwort und Name sind erforderlich' },
        { status: 400 }
      );
    }

    // Passwort-Validierung
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Passwort muss mindestens 6 Zeichen lang sein' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Ein Benutzer mit dieser Email existiert bereits' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        company: businessName || company, // Use businessName if provided, fallback to company
        plan: 'free',
      }
    });

    // Initialize usage tracking - create individual entries per tool
    const currentMonth = new Date().toISOString().slice(0, 7);
    const tools = ['naehrwert', 'speisekarten', 'kostenkontrolle', 'lagerverwaltung', 'menueplaner'];

    for (const tool of tools) {
      await prisma.usageTracking.create({
        data: {
          userId: user.id,
          tool: tool,
          count: 0,
          month: currentMonth,
        }
      });
    }

    // Return success (ohne Passwort)
    const { password: _, ...userWithoutPassword } = user;
    
    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      message: 'Registrierung erfolgreich! Sie können sich jetzt anmelden.'
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registrierung fehlgeschlagen' },
      { status: 500 }
    );
  }
}