import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class AnswerItemDto {
  @ApiProperty({ example: 1, description: 'Question ID (1 to 20)' })
  @IsInt()
  @Min(1)
  @Max(20)
  questionId!: number;

  @ApiProperty({
    example: 1,
    description: 'Selected option index: 0 for A, 1 for B, 2 for C, 3 for D',
  })
  @IsInt()
  @Min(0)
  @Max(3)
  selectedOption!: number;
}

export class SubmitDiwaliChallengeDto {
  @ApiProperty({
    example: 'aditya.sharma@gmail.com',
    description: 'Enrolled student email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    type: [AnswerItemDto],
    description: 'Array of 20 answered questions',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerItemDto)
  answers!: AnswerItemDto[];
}
