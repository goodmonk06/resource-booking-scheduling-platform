import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RecurringReservationsService } from './recurring-reservations.service';
import { CreateRecurringReservationDto } from './dto/create-recurring-reservation.dto';
import { UpdateRecurringReservationDto } from './dto/update-recurring-reservation.dto';

@ApiTags('Recurring Reservations')
@Controller('recurring-reservations')
export class RecurringReservationsController {
  constructor(
    private readonly recurringReservationsService: RecurringReservationsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a recurring reservation series' })
  @ApiResponse({
    status: 201,
    description: 'Recurring reservation series created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or validation error',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict detected for one or more instances',
  })
  async create(@Body() createDto: CreateRecurringReservationDto) {
    return this.recurringReservationsService.create(createDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get recurring reservation details' })
  @ApiParam({
    name: 'id',
    description: 'Parent reservation ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the recurring reservation with all instances',
  })
  @ApiResponse({
    status: 404,
    description: 'Recurring reservation not found',
  })
  async findOne(@Param('id') id: string) {
    return this.recurringReservationsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update recurring reservation (future instances only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Parent reservation ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Recurring reservation updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Recurring reservation not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateRecurringReservationDto,
  ) {
    return this.recurringReservationsService.update(id, updateDto);
  }

  @Delete(':id/instance/:date')
  @ApiOperation({ summary: 'Cancel a single instance from the series' })
  @ApiParam({
    name: 'id',
    description: 'Parent reservation ID',
  })
  @ApiParam({
    name: 'date',
    description: 'Date of the instance to cancel (ISO 8601 format)',
  })
  @ApiResponse({
    status: 200,
    description: 'Instance cancelled successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Instance not found',
  })
  async cancelInstance(
    @Param('id') id: string,
    @Param('date') date: string,
  ) {
    return this.recurringReservationsService.cancelInstance(id, date);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel entire recurring series (all future instances)' })
  @ApiParam({
    name: 'id',
    description: 'Parent reservation ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Series cancelled successfully',
  })
  async cancelSeries(@Param('id') id: string) {
    return this.recurringReservationsService.cancelSeries(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all recurring reservations for a user' })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of recurring reservations for the user',
  })
  async findByUser(@Param('userId') userId: string) {
    return this.recurringReservationsService.findByUser(userId);
  }

  @Get('resource/:resourceId')
  @ApiOperation({ summary: 'Get all recurring reservations for a resource' })
  @ApiParam({
    name: 'resourceId',
    description: 'Resource ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of recurring reservations for the resource',
  })
  async findByResource(@Param('resourceId') resourceId: string) {
    return this.recurringReservationsService.findByResource(resourceId);
  }
}
