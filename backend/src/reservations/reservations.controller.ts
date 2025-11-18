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
import { ReservationsService } from './reservations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReservationStatus } from '@prisma/client';

@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a reservation' })
  create(
    @Body()
    createDto: {
      resourceId: string;
      userId?: string;
      startsAt: string;
      endsAt: string;
      metaJson?: any;
    },
  ) {
    return this.reservationsService.create({
      resourceId: createDto.resourceId,
      userId: createDto.userId,
      startsAt: new Date(createDto.startsAt),
      endsAt: new Date(createDto.endsAt),
      metaJson: createDto.metaJson,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all reservations' })
  findAll(
    @Query('resourceId') resourceId?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: ReservationStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reservationsService.findAll({
      resourceId,
      userId,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reservation by ID' })
  findOne(@Param('id') id: string) {
    return this.reservationsService.findOne(id);
  }

  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm a reservation' })
  confirm(
    @Param('id') id: string,
    @Body() body: { stripePaymentId?: string },
  ) {
    return this.reservationsService.confirm(id, body.stripePaymentId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a reservation' })
  cancel(
    @Param('id') id: string,
    @Body() body: { cancellationNote?: string },
  ) {
    return this.reservationsService.cancel(id, body.cancellationNote);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update reservation' })
  update(
    @Param('id') id: string,
    @Body()
    updateDto: {
      startsAt?: string;
      endsAt?: string;
      status?: ReservationStatus;
      metaJson?: any;
    },
  ) {
    const data: any = { ...updateDto };
    if (updateDto.startsAt) {
      data.startsAt = new Date(updateDto.startsAt);
    }
    if (updateDto.endsAt) {
      data.endsAt = new Date(updateDto.endsAt);
    }
    return this.reservationsService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete reservation' })
  remove(@Param('id') id: string) {
    return this.reservationsService.remove(id);
  }
}
