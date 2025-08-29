import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export class EmailService {
  private defaultFrom = 'GastroTools <noreply@gastrotools.de>';

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.log('📧 Email service not configured - would send:', options.subject);
        return true; // Return success in development
      }

      await resend.emails.send({
        from: options.from || this.defaultFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      console.log(`📧 Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      console.error('📧 Email send failed:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string, language: 'de' | 'en' = 'de'): Promise<boolean> {
    const resetUrl = `${process.env.NEXT_PUBLIC_API_URL}/reset-password?token=${resetToken}`;
    
    const templates = {
      de: {
        subject: 'GastroTools - Passwort zurücksetzen',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #7c3aed;">Passwort zurücksetzen</h1>
            <p>Sie haben eine Passwort-Zurücksetzung für Ihr GastroTools-Konto angefordert.</p>
            <p>Klicken Sie auf den folgenden Link, um Ihr Passwort zurückzusetzen:</p>
            <a href="${resetUrl}" style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
              Passwort zurücksetzen
            </a>
            <p>Dieser Link ist 1 Stunde gültig.</p>
            <p>Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px;">
              GastroTools - Professionelle Restaurant-Management-Tools<br>
              Diese E-Mail wurde automatisch generiert.
            </p>
          </div>
        `
      },
      en: {
        subject: 'GastroTools - Reset Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #7c3aed;">Reset Password</h1>
            <p>You have requested a password reset for your GastroTools account.</p>
            <p>Click the following link to reset your password:</p>
            <a href="${resetUrl}" style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
              Reset Password
            </a>
            <p>This link is valid for 1 hour.</p>
            <p>If you did not request this, please ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px;">
              GastroTools - Professional Restaurant Management Tools<br>
              This email was automatically generated.
            </p>
          </div>
        `
      }
    };

    const template = templates[language];
    
    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html
    });
  }

  async sendContactEmail(data: { name: string; email: string; subject: string; message: string }): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7c3aed;">Neue Kontaktanfrage</h1>
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>E-Mail:</strong> ${data.email}</p>
        <p><strong>Betreff:</strong> ${data.subject}</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>Nachricht:</h3>
          <p style="white-space: pre-wrap;">${data.message}</p>
        </div>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 14px;">
          GastroTools Kontaktformular<br>
          Automatisch generiert von gastrotools.de
        </p>
      </div>
    `;

    return this.sendEmail({
      to: 'info@gastrotools.de', // Your business email
      subject: `Kontaktanfrage: ${data.subject}`,
      html: html
    });
  }
}

export const emailService = new EmailService();