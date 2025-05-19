import { Injectable } from '@nestjs/common';

interface VerificationData {
  code: string;
  email: string;
  expiresAt: number;
}

@Injectable()
export class CacheService {
  private verificationCodes: Map<string, VerificationData> = new Map();

  public setVerificationCode(email: string, code: string): void {
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour from now
    this.verificationCodes.set(email, {
      code,
      email,
      expiresAt,
    });
  }

  public getVerificationCode(email: string): string | null {
    const data = this.verificationCodes.get(email);
    if (!data) return null;

    // Check if code has expired
    if (Date.now() > data.expiresAt) {
      this.verificationCodes.delete(email);
      return null;
    }

    return data.code;
  }

  public deleteVerificationCode(email: string): void {
    this.verificationCodes.delete(email);
  }

  // Clean up expired codes (can be called periodically)
  public cleanupExpiredCodes(): void {
    const now = Date.now();
    for (const [email, data] of this.verificationCodes.entries()) {
      if (now > data.expiresAt) {
        this.verificationCodes.delete(email);
      }
    }
  }
}
