import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterStudentDto {
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
    college!: string;

  @ApiProperty()
    @IsString()
    @IsNotEmpty()
    course!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty()
    @IsString()
    @IsNotEmpty()
    year!: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  skills?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

 

@ApiProperty({
  type: 'string',
  format: 'binary',
  required: false,
})
@IsOptional()
idCardUrl?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  state?: string;
  
}