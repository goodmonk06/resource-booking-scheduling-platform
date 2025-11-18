import { IsString, IsOptional, IsInt, Min, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateResourceDto {
  @ApiProperty({ description: 'Resource group ID' })
  @IsUUID()
  groupId: string;

  @ApiProperty({ description: 'Resource name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Resource description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Capacity (number of people/items)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ description: 'Additional metadata as JSON' })
  @IsOptional()
  metaJson?: any;

  @ApiPropertyOptional({ description: 'Is resource active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
