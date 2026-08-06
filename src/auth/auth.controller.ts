import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from '../config/multer.config';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RegisterStudentDto } from './dto/Registerstudent.dto';
import { AuthService } from './auth.service';
import { RegisterBusinessDto } from './dto/Registerbussiness.dto';
import { LoginDto } from './dto/login.dto';
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // @Post('register/student')
  // @ApiOperation({ summary: 'Register a new user' })
  // @ApiResponse({ status: 201, description: 'User successfully registered.' })
  // async register(@Body() registerDto: RegisterStudentDto) {
  //   const data = await this.authService.registerStudent(registerDto);
  //   return { message: 'Registration Successful', data };
  // }

  @Post('register/student')
@UseInterceptors(FileInterceptor('idCardUrl', multerConfig))
@ApiConsumes('multipart/form-data')
@ApiOperation({ summary: 'Student Register' })
async register(
  @UploadedFile() file: Express.Multer.File,
  @Body() registerDto: RegisterStudentDto,
) {
  if (file) {
    registerDto.idCardUrl = file.path;
  }

  const data = await this.authService.registerStudent(registerDto);

  return {
    message: 'Registration Successful',
    data,
  };
}


  //  @Post('register/business')
  // @ApiOperation({ summary: 'Register a new user' })
  // @ApiResponse({ status: 201, description: 'User successfully registered.' })
  // async bussinessregister(@Body() registerDto: RegisterBusinessDto) {
  //   const data = await this.authService.registerBusiness(registerDto);
  //   return { message: 'Registration Successful', data };
  // }

  @Post('register/business')
@UseInterceptors(FileInterceptor('visitingCardUrl', multerConfig))
@ApiConsumes('multipart/form-data')
@ApiOperation({ summary: 'Business Register' })
async businessRegister(
  @UploadedFile() file: Express.Multer.File,
  @Body() registerDto: RegisterBusinessDto,
) {
  if (file) {
    registerDto.visitingCardUrl = file.path;
  }

  const data = await this.authService.registerBusiness(registerDto);

  return {
    message: 'Registration Successful',
    data,
  };
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
