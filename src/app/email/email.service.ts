import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    this.resend = new Resend('re_9r9boxcm_JcGv47LLDk7viRvwF3xQqmgw');
  }

  private generateVerificationCode(): string {
    // Generate a 6-digit code
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  public async sendVerifyCode(email: string, code: string) {
    try {
      const data = await this.resend.emails.send({
        from: 'Rating Everything <onboarding@resend.dev>',
        to: email,
        subject: 'Your Registration Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to Rating Everything!</h2>
            <p>Your verification code is:</p>
            <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0;">
              <strong>${code}</strong>
            </div>
            <p>This code will expire in 1 hour.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      });

      if (data.error) {
        this.logger.error(`Failed to send email: ${data.error.message}`);
        return false;
      }

      this.logger.log(`Email sent successfully to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      return false;
    }
  }
}
