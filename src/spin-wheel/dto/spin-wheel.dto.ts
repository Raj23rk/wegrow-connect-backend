import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class SpinWheelDto {
  @ApiProperty({
    example: 'aditya.sharma@gmail.com',
    description: 'Verified Student Email Address',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
