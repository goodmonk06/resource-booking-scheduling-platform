import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsArray,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { RecurrencePattern } from '@prisma/client';

export class UpdateRecurringReservationDto {
  @ApiPropertyOptional({
    description: 'Update recurrence pattern',
    enum: RecurrencePattern,
  })
  @IsOptional()
  @IsEnum(RecurrencePattern)
  pattern?: RecurrencePattern;

  @ApiPropertyOptional({
    description: 'Update interval',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  interval?: number;

  @ApiPropertyOptional({
    description: 'Update days of week for WEEKLY pattern',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  daysOfWeek?: number[];

  @ApiPropertyOptional({
    description: 'Update day of month for MONTHLY pattern',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ApiPropertyOptional({
    description: 'Update end date for the recurrence series',
  })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({
    description: 'Update number of occurrences',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  occurrences?: number;

  @ApiPropertyOptional({
    description: 'Add exception dates (dates to skip)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  addExceptions?: string[];
}
