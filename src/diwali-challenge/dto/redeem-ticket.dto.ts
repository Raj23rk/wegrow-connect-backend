import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RedeemDemoTicketDto {
  @ApiProperty({
    example: 'WGW-DEMO-84920',
    description: 'Unique Demo Ticket Code won by student (Score >= 80)',
  })
  @IsString()
  @IsNotEmpty()
  ticketCode!: string;

  @ApiPropertyOptional({
    example: 'Enrolled for Batch starting Monday at WeGrow Tech Hub',
    description: 'Optional staff or counselor note',
  })
  @IsString()
  @IsOptional()
  staffNote?: string;
}
