import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifySpinOtpDto {
  @ApiProperty({
    example: 'aditya.sharma@gmail.com',
    description: 'Registered Student Email',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP received via email' })
  @IsString()
  @Length(4, 8, { message: 'OTP must be between 4 and 8 characters' })
  otp!: string;
}
