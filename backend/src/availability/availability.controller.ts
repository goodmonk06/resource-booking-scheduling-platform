import { Controller, Get, Query, Param, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';

@ApiTags('availability')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get('slots/:resourceId')
  @ApiOperation({ summary: 'Get available time slots for a resource' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiQuery({ name: 'duration', required: true, type: Number })
  @ApiQuery({ name: 'interval', required: false, type: Number })
  async getAvailableSlots(
    @Param('resourceId') resourceId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('duration') duration: string,
    @Query('interval') interval?: string,
  ) {
    return this.availabilityService.getAvailableSlots(
      resourceId,
      new Date(startDate),
      new Date(endDate),
      parseInt(duration),
      interval ? parseInt(interval) : 30,
    );
  }

  @Post('check')
  @ApiOperation({ summary: 'Check if a specific time slot is available' })
  async checkAvailability(
    @Body()
    body: {
      resourceId: string;
      startsAt: string;
      endsAt: string;
    },
  ) {
    const available = await this.availabilityService.checkAvailability(
      body.resourceId,
      new Date(body.startsAt),
      new Date(body.endsAt),
    );

    return {
      available,
      resourceId: body.resourceId,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
    };
  }
}
