import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({
    example: '64f1b2c3d4e5f6g7h8i9j0k1',
    description: 'Subscription plan ID',
  })
  @IsString()
  @IsNotEmpty()
  planId!: string;
}
