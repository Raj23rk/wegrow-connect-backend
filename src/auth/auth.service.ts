import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterStudentDto } from './dto/Registerstudent.dto';
import { UserDocument, UserRole } from 'src/users/schemas/user.schema';
import { RegisterBusinessDto } from './dto/Registerbussiness.dto';

import * as crypto from 'crypto';


@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,

  ) {}

 

// studentRegsiter
async registerStudent(dto: RegisterStudentDto) {
  const existingUser = await this.usersService.findOneByEmail(dto.email);

  if (existingUser) {
    throw new BadRequestException('Email already exists');
  }

  const hashedPassword = await bcrypt.hash(dto.password, 10);

  const user = await this.usersService.create({
    ...dto,
    password: hashedPassword,
    role: UserRole.STUDENT,
  });

  return this.generateToken(user);
}

//BussinessRegsiter
async registerBusiness(dto: RegisterBusinessDto) {
  const existingUser = await this.usersService.findOneByEmail(dto.email);

  if (existingUser) {
    throw new BadRequestException('Email already exists');
  }

  const hashedPassword = await bcrypt.hash(dto.password, 10);

  const user = await this.usersService.create({
    ...dto,
    password: hashedPassword,
    role: UserRole.BUSINESS,
  });

  return this.generateToken(user);
}


  //login api
  async login(loginDto: LoginDto) {
    const user = await this.usersService.findOneByEmail(loginDto.email);
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user._id, role: user.role };
    return {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
      accessToken: this.jwtService.sign(payload),
    };
  }


  //Token 
  private generateToken(user: UserDocument) {
  const payload = {
    sub: user._id,
    email: user.email,
    role: user.role,
  };

  return {
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    },
    accessToken: this.jwtService.sign(payload),
  };
}


}
