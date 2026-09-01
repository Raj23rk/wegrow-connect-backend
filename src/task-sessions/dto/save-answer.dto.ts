import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SaveAnswerDto {
  @ApiProperty({ example: 'My draft answer text...' })
  @IsString()
  @IsNotEmpty()
  answer!: string;
}
