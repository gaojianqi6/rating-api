import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth2';
import {
  GOOGLE_CALLBACK_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
} from 'src/app/config/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor() {
    super({
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
      scope: ['email', 'profile'],
    });

    this.logger.log(`Google Strategy initialized with:
      clientID: ${GOOGLE_CLIENT_ID?.substring(0, 5)}...
      callbackURL: ${GOOGLE_CALLBACK_URL}
    `);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    this.logger.log(
      `Google Strategy validate: 
      accessToken: ${accessToken}...
      refreshToken: ${refreshToken}
      profile: ${profile}
      `,
    );
    const { id, name, emails } = profile;
    const user = {
      googleId: id,
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
    };
    done(null, user);
  }
}
