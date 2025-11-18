import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OpeningHoursService } from './opening-hours.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('opening-hours')
@Controller('opening-hours')
export class OpeningHoursController {
  constructor(private readonly openingHoursService: OpeningHoursService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create opening hours' })
  create(
    @Body()
    createDto: {
      resourceId?: string;
      groupId?: string;
      weekday: number;
      startTime: string;
      endTime: string;
    },
  ) {
    const data: any = {
      weekday: createDto.weekday,
      startTime: createDto.startTime,
      endTime: createDto.endTime,
    };

    if (createDto.resourceId) {
      data.resource = { connect: { id: createDto.resourceId } };
    }
    if (createDto.groupId) {
      data.group = { connect: { id: createDto.groupId } };
    }

    return this.openingHoursService.create(data);
  }

  @Get()
  @ApiOperation({ summary: 'Get all opening hours' })
  findAll(
    @Query('resourceId') resourceId?: string,
    @Query('groupId') groupId?: string,
  ) {
    return this.openingHoursService.findAll(resourceId, groupId);
  }

  @Get('resource/:resourceId')
  @ApiOperation({ summary: 'Get opening hours for a specific resource' })
  getResourceOpeningHours(@Param('resourceId') resourceId: string) {
    return this.openingHoursService.getResourceOpeningHours(resourceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get opening hours by ID' })
  findOne(@Param('id') id: string) {
    return this.openingHoursService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update opening hours' })
  update(
    @Param('id') id: string,
    @Body()
    updateDto: {
      weekday?: number;
      startTime?: string;
      endTime?: string;
    },
  ) {
    return this.openingHoursService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete opening hours' })
  remove(@Param('id') id: string) {
    return this.openingHoursService.remove(id);
  }
}
