import { IsString, IsOptional, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({ description: 'Resource ID to book' })
  @IsUUID()
  resourceId: string;

  @ApiPropertyOptional({ description: 'User ID (optional for anonymous bookings)' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: 'Start date and time (ISO 8601)', example: '2024-01-15T10:00:00Z' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ description: 'End date and time (ISO 8601)', example: '2024-01-15T11:00:00Z' })
  @IsDateString()
  endsAt: string;

  @ApiPropertyOptional({ description: 'Additional metadata (customer info, notes, etc.)' })
  @IsOptional()
  metaJson?: any;
}
