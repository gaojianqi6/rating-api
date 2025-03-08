import {
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
  Req,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { WEBSITE_URL } from '../config/config';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
