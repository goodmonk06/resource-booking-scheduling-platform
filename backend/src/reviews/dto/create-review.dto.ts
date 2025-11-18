import { IsString, IsInt, IsOptional, Min, Max, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ description: 'Resource ID' })
  @IsUUID()
  resourceId: string;

  @ApiProperty({ description: 'User ID creating the review' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Reservation ID being reviewed' })
  @IsUUID()
  reservationId: string;

  @ApiProperty({ description: 'Rating (1-5 stars)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Review comment' })
  @IsOptional()
  @IsString()
  comment?: string;
}
