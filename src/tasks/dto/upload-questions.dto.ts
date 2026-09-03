import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty } from 'class-validator';

export class UploadQuestionsDto {
  @ApiProperty({
    description: 'List of questions',
    example: [
      {
        id: 'q1',
        question: 'What is the primary goal of lean startup methodology?',
        type: 'MCQ',
        options: ['Maximize funding', 'Rapid experimentation and validation', 'Hiring large teams', 'Traditional business planning'],
        marks: 10,
      },
    ],
  })
  @IsArray()
  @IsNotEmpty()
  questions!: any[];
}

export class UploadAnswerKeyDto {
  @ApiProperty({
    description: 'Answer key matching question IDs',
    example: [
      {
        questionId: 'q1',
        correctAnswer: 'Rapid experimentation and validation',
        marks: 10,
      },
    ],
  })
  @IsArray()
  @IsNotEmpty()
  answerKey!: any[];
}
