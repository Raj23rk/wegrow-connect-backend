import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { QueryAbout } from '../schemas/contact.schema';

export class CreateContactDto {
  @ApiProperty({
    example: 'Raj Kumar',
    description: 'Full name of the person',
  })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({
    example: 'raj@gmail.com',
    description: 'Email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: '9876543210',
    description: '10 digit mobile number',
  })
  @IsString()
  @IsNotEmpty()
  @Length(10, 10)
  @Matches(/^[6-9][0-9]{9}$/, {
    message:
      'Mobile number must be a valid 10-digit Indian mobile number',
  })
  mobileNumber!: string;

  @ApiProperty({
    example: ['BUSINESS', 'COURSE'],
    enum: QueryAbout,
    isArray: true,
    description:
      'Select one or more query categories',
  })
  @IsArray()
  @IsNotEmpty()
  @IsEnum(QueryAbout, {
    each: true,
  })
  queryAbout!: QueryAbout[];

  @ApiProperty({
    example:
      'I want to know more about your upcoming workshops.',
    description: 'User query/message',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  query!: string;
}