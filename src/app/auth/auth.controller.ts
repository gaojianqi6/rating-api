import {
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
  Req,
  Res,
  Body,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { WEBSITE_URL } from '../config/config';
import { EmailService } from '../email/email.service';
import { CacheService } from '../cache/cache.service';
import { UserService } from '../user/user.service';
import { SendRegisterEmailDto } from './dto/send-register-email.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private emailService: EmailService,
    private cacheService: CacheService,
    private userService: UserService,
  ) {}

  @ApiOperation({ summary: 'Send registration verification email' })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent successfully',
  })
  @ApiResponse({ status: 400, description: 'Email already registered' })
  @ApiResponse({
    status: 500,
    description: 'Failed to send verification email',
  })
  @ApiBody({ type: SendRegisterEmailDto })
  @Post('send-register-email')
  async sendRegisterEmail(@Body() dto: SendRegisterEmailDto) {
    this.logger.log(
      `Received request to send verification email to ${dto.email}`,
    );

    const { email } = dto;

    // Check if email is already registered
    const existingUser = await this.userService.user({ email });
    if (existingUser) {
      this.logger.warn(`Email ${email} is already registered`);
      throw new BadRequestException('Email is already registered');
    }

    // Generate verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.logger.debug(`Generated verification code for ${email}`);

    // Store in cache
    this.cacheService.setVerificationCode(email, code);

    // Send email
    const sent = await this.emailService.sendVerifyCode(email, code);
    if (!sent) {
      this.logger.error(`Failed to send verification email to ${email}`);
      throw new InternalServerErrorException(
        'Failed to send verification email. Please try again later.',
      );
    }

    this.logger.log(`Successfully sent verification email to ${email}`);
    return { message: 'Verification email sent successfully' };
  }

  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'User logged in successfully' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiBody({ type: LoginDto })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  /**
   * Initiates the Google OAuth flow
   * The guard handles the redirection, will redirect to Google before reaching this point
   */
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirects to Google OAuth page' })
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // This function won't actually execute because the guard
  }

  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated with Google',
  })
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Req() req, @Res() res) {
    // The user has been validated and is available in req.user
    // Process the user and generate JWT
    const user = req.user;

    // Validate the Google user and get/create our database user
    const dbUser = await this.authService.validateGoogleUser(user);

    // Generate JWT token
    const { access_token } = await this.authService.login(dbUser);

    return res.redirect(`${WEBSITE_URL}/auth/success?token=${access_token}`);
  }
}
