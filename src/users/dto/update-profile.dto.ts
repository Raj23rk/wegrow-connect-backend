import {
  IsOptional,
  IsString,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';


export class UpdateProfileDto {

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;


  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;


  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;


  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;


  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  state?: string;


  // Student fields

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  college?: string;


  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  course?: string;


  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  department?: string;


  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  year?: string;


  // Business fields

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  companyName?: string;


  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  businessType?: string;


  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  designation?: string;


  @ApiProperty({ required: false })
  @IsOptional()
  experience?: number;


  @ApiProperty({ required: false })
  @IsOptional()
  website?: string;

  @ApiProperty({ required: false })
@IsOptional()
idCardUrl?: string;

@ApiProperty({ required: false })
@IsOptional()
visitingCardUrl?: string;

  
}