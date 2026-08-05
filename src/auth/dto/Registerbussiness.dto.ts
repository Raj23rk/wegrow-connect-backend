import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterBusinessDto {
  @ApiProperty()
    @IsString()
    @IsNotEmpty()
    firstName!: string;

  @ApiProperty()
    @IsString()
    @IsNotEmpty()
    lastName!: string;

  @ApiProperty()
    @IsEmail()
    email!: string;

  @ApiProperty()
    @IsString()
    @MinLength(6)
    password!: string;

   @ApiProperty()
    @IsString()
    @IsNotEmpty()
    phone!: string;


  @ApiProperty()
    @IsString()
    @IsNotEmpty()
    companyName!: string;

  @ApiProperty()
    @IsString()
    @IsNotEmpty()
    businessType!: string;

  @ApiProperty()
    @IsString()
    @IsNotEmpty()
    designation!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  experience?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  state?: string;
}