import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RegisterBusinessDto } from './dto/Registerbussiness.dto';
import { RegisterStudentDto } from './dto/Registerstudent.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/student')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered.' })
  async register(@Body() registerDto: RegisterStudentDto) {
    const data = await this.authService.registerStudent(registerDto);
    return { message: 'Registration Successful', data };
  }


   @Post('register/business')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered.' })
  async bussinessregister(@Body() registerDto: RegisterBusinessDto) {
    const data = await this.authService.registerBusiness(registerDto);
    return { message: 'Registration Successful', data };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async login(@Body() loginDto: LoginDto) {
    const data = await this.authService.login(loginDto);
    return { message: 'Login Successful', data };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  async logout() {
    return { message: 'Logout Successful', data: {} };
  }
}
