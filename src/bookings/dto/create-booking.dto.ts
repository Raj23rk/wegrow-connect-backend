import { IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({
    example: '68918d2c71b3dc65f5f7e123',
  })
  @IsMongoId()
  event!: string;
}
