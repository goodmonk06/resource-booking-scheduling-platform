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
import { BookingPoliciesService } from './booking-policies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('booking-policies')
@Controller('booking-policies')
export class BookingPoliciesController {
  constructor(
    private readonly bookingPoliciesService: BookingPoliciesService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a booking policy' })
  create(
    @Body()
    createDto: {
      tenantId: string;
      name: string;
      rulesJson: any;
      isDefault?: boolean;
    },
  ) {
    return this.bookingPoliciesService.create({
      name: createDto.name,
      rulesJson: createDto.rulesJson,
      isDefault: createDto.isDefault || false,
      tenant: {
        connect: { id: createDto.tenantId },
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all booking policies' })
  findAll(@Query('tenantId') tenantId?: string) {
    return this.bookingPoliciesService.findAll(tenantId);
  }

  @Get('default/:tenantId')
  @ApiOperation({ summary: 'Get default policy for tenant' })
  findDefaultPolicy(@Param('tenantId') tenantId: string) {
    return this.bookingPoliciesService.findDefaultPolicy(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking policy by ID' })
  findOne(@Param('id') id: string) {
    return this.bookingPoliciesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update booking policy' })
  update(
    @Param('id') id: string,
    @Body() updateDto: { name?: string; rulesJson?: any; isDefault?: boolean },
  ) {
    return this.bookingPoliciesService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete booking policy' })
  remove(@Param('id') id: string) {
    return this.bookingPoliciesService.remove(id);
  }
}
