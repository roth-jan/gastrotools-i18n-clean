import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { emailService } from '@/lib/email-service';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { email, language = 'de' } = await request.json();

    // Validation
    if (!email) {
      return NextResponse.json(
        { error: language === 'en' ? 'Email is required' : 'E-Mail ist erforderlich' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal if email exists (security)
      return NextResponse.json({
        success: true,
        message: language === 'en' 
          ? 'If an account with this email exists, you will receive a password reset email.'
          : 'Falls ein Konto mit dieser E-Mail existiert, erhalten Sie eine E-Mail zum Zurücksetzen des Passworts.'
      });
    }

    // Generate reset token (expires in 1 hour)
    const resetToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        type: 'password_reset' 
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    // Send reset email
    const emailSent = await emailService.sendPasswordResetEmail(
      email, 
      resetToken, 
      language as 'de' | 'en'
    );

    if (emailSent) {
      return NextResponse.json({
        success: true,
        message: language === 'en'
          ? 'Password reset email sent. Check your inbox.'
          : 'E-Mail zum Zurücksetzen wurde gesendet. Prüfen Sie Ihr Postfach.'
      });
    } else {
      return NextResponse.json(
        { error: language === 'en' ? 'Email service error' : 'E-Mail-Service-Fehler' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}