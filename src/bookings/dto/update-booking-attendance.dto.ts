import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBookingAttendanceDto {
  @ApiProperty({
    description: 'Mark attendance for the booking',
    example: true,
  })
  @IsBoolean()
  attended!: boolean;
}
