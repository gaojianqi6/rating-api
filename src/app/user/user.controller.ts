import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User as UserModel } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('Users')
@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({ type: CreateUserDto })
  @Post()
  async createUser(@Body() createUserDto: CreateUserDto): Promise<UserModel> {
    return this.userService.createUser(createUserDto);
  }

  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'Returns an array of users.',
  })
  @Get()
  async getAllUsers(): Promise<UserModel[]> {
    return this.userService.users({});
  }

  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'Returns the authenticated user profile.',
  })
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req): Promise<UserModel | null> {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException('User ID is missing from the request.');
    }
    this.logger.debug(`User ID: ${req.user.userId}`);
    return this.userService.userById({ id: Number(req.user.userId) });
  }

  @ApiOperation({
    summary: 'Get all ratings for the authenticated user, grouped by template',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the user’s ratings grouped by template.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          templateId: { type: 'number', example: 1 },
          templateName: { type: 'string', example: 'movie' },
          templateDisplayName: { type: 'string', example: 'Movie' },
          ratings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
                title: { type: 'string', example: 'Echoes of Tomorrow' },
                slug: { type: 'string', example: 'echoes-of-tomorrow' },
                year: { type: 'number', example: 2025 },
                poster: {
                  type: 'string',
                  example: 'https://example.com/poster.jpg',
                },
                rating: { type: 'number', example: 10 },
                comment: { type: 'string', example: 'Does it right!' },
              },
            },
          },
        },
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  @Get('ratings')
  async getUserRatings(@Req() req): Promise<
    Array<{
      templateId: number;
      templateName: string;
      templateDisplayName: string;
      ratings: Array<{
        id: number;
        title: string;
        slug: string;
        year: number;
        poster: string;
        rating: number;
        comment: string;
      }>;
    }>
  > {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException('User ID is missing from the request.');
    }
    return this.userService.getUserRatings(req.user.userId);
  }

  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the user with the specified ID.',
  })
  @ApiParam({ name: 'id', description: 'The ID of the user to retrieve.' })
  @Get('/get/:id')
  @UseGuards(JwtAuthGuard)
  async getUserById(@Param('id') id: string): Promise<UserModel | null> {
    return this.userService.userById({ id: Number(id) });
  }

  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({
    status: 200,
    description: 'The user has been successfully updated.',
  })
  @ApiParam({ name: 'id', description: 'The ID of the user to update.' })
  @ApiBody({ type: UpdateUserDto })
  @Patch(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserModel> {
    return this.userService.updateUser({
      where: { id: Number(id) },
      data: updateUserDto,
    });
  }

  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({
    status: 200,
    description: 'Password has been successfully changed.',
  })
  @ApiBody({ type: ChangePasswordDto })
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<UserModel> {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException('User ID is missing from the request.');
    }
    return this.userService.changePassword(req.user.userId, changePasswordDto);
  }

  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({
    status: 200,
    description: 'The user has been successfully deleted.',
  })
  @ApiParam({ name: 'id', description: 'The ID of the user to delete.' })
  @Delete(':id')
  async deleteUser(@Param('id') id: string): Promise<UserModel> {
    return this.userService.deleteUser({ id: Number(id) });
  }
}
