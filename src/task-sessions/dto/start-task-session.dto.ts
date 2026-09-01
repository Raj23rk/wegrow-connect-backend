import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';

export class StartTaskSessionDto {
  @ApiProperty({ example: '60d5ec49f1b2c80015f8e1a2', description: 'MongoDB ObjectId of Student' })
  @IsMongoId()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty({ example: '60d5ec49f1b2c80015f8e1b3', description: 'MongoDB ObjectId of Task' })
  @IsMongoId()
  @IsNotEmpty()
  taskId!: string;
}
