import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsDateString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsArray,
  ValidateIf,
} from 'class-validator';
import { RecurrencePattern } from '@prisma/client';

export class CreateRecurringReservationDto {
  @ApiProperty({ description: 'Resource to book' })
  @IsUUID()
  resourceId: string;

  @ApiProperty({ description: 'User making the reservation' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Start date and time for the first instance' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: 'End date and time for the first instance' })
  @IsDateString()
  endTime: string;

  @ApiProperty({
    description: 'Recurrence pattern',
    enum: RecurrencePattern,
  })
  @IsEnum(RecurrencePattern)
  pattern: RecurrencePattern;

  @ApiPropertyOptional({
    description: 'Interval (e.g., every 2 weeks)',
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  interval?: number;

  @ApiPropertyOptional({
    description: 'Days of week for WEEKLY pattern (0=Sunday, 6=Saturday)',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @ValidateIf((o) => o.pattern === RecurrencePattern.WEEKLY)
  daysOfWeek?: number[];

  @ApiPropertyOptional({
    description: 'Day of month for MONTHLY pattern (1-31)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  @ValidateIf((o) => o.pattern === RecurrencePattern.MONTHLY)
  dayOfMonth?: number;

  @ApiPropertyOptional({
    description: 'End date for the recurrence series',
  })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({
    description: 'Number of occurrences (alternative to endsAt)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  occurrences?: number;

  @ApiPropertyOptional({
    description: 'Additional metadata in JSON format',
  })
  @IsOptional()
  metaJson?: any;
}
