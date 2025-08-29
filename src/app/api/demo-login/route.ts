import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET() {
  try {
    // Create demo user data
    const demoUser = {
      id: 'demo-user-123',
      email: 'demo@gastrotools.de',
      name: 'Demo User',
      company: 'Demo Restaurant GmbH',
      plan: 'free'
    };

    // Create demo usage data
    const demoUsage = {
      speisekartenCount: 2,
      recipesCount: 8,
      exportsCount: 5
    };

    // Create JWT token for demo user
    const token = jwt.sign(
      { 
        userId: demoUser.id,
        email: demoUser.email,
        plan: demoUser.plan
      },
      process.env.JWT_SECRET || 'local-development-secret-key',
      { expiresIn: '7d' }
    );

    // Create a landing page that will set localStorage then redirect
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Demo Login - GastroTools</title>
        </head>
        <body>
          <script>
            // Set demo data in localStorage
            localStorage.setItem('token', '${token}');
            localStorage.setItem('user', '${JSON.stringify(demoUser).replace(/'/g, "\\'")}');
            
            // Redirect to dashboard
            window.location.href = '/dashboard';
          </script>
        </body>
      </html>
    `;
    
    const response = new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });
    
    // Set auth cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    // Set demo user data in cookies for client-side access
    response.cookies.set('demo-user', JSON.stringify(demoUser), {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    response.cookies.set('demo-usage', JSON.stringify(demoUsage), {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;

  } catch (error) {
    console.error('Demo login error:', error);
    return NextResponse.redirect(new URL('/login?error=demo-failed', process.env.NEXT_PUBLIC_URL || 'http://localhost:3009'));
  }
}