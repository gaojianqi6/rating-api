import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    usernameOrEmail: string,
    password: string,
  ): Promise<User | null> {
    // Try to find user by username first
    let user = await this.userService.user({ username: usernameOrEmail });

    // If not found by username, try email
    if (!user) {
      user = await this.userService.user({ email: usernameOrEmail });
    }

    // If user found and password matches
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }

  /**
   * JWT Token: User ID (sub), Token expiration time (exp), Issued at time (iat)
   * { username: 'johndoe', sub: 2, iat: 1741336630, exp: 1741340230 }
   */
  async login(user: User) {
    const payload = {
      sub: user.id,
      username: user.username,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async validateGoogleUser(profile: any): Promise<User> {
    const { googleId, email, firstName, lastName } = profile;

    // Check if user exists
    let user = await this.userService.user({ googleId });

    // If no user with this Google ID exists, check by email
    if (!user) {
      user = await this.userService.user({ email });

      if (user) {
        // User exists but Google ID is not linked - update user with Google ID
        user = await this.userService.updateUser({
          where: { id: user.id },
          data: { googleId },
        });
      } else {
        // Create new user with Google information
        // Generate a random password since we won't use it
        const randomPassword = Math.random().toString(36).slice(-8);

        user = await this.userService.createUser({
          email,
          googleId,
          // Use email as username if needed, or create one based on firstName+lastName
          username: email.split('@')[0],
          nickname: firstName,
          password: randomPassword, // This won't be used for login
          avatar: null, // You could grab profile picture from Google if available
          description: null,
          country: null,
        });
      }
    }

    // Update last login time
    await this.userService.updateUser({
      where: { id: user.id },
      data: { loggedInAt: new Date() },
    });

    return user;
  }
}
