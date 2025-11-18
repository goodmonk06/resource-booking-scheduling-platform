import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { DateRangeQueryDto } from './dto/date-range-query.dto';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard summary metrics' })
  @ApiQuery({
    name: 'tenantId',
    required: false,
    description: 'Filter by tenant ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns dashboard summary with key metrics',
  })
  async getDashboardSummary(@Query('tenantId') tenantId?: string) {
    return this.analyticsService.getDashboardSummary(tenantId);
  }

  @Get('resources/:resourceId/utilization')
  @ApiOperation({ summary: 'Get resource utilization metrics' })
  @ApiParam({
    name: 'resourceId',
    description: 'Resource ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns utilization metrics for the resource',
  })
  async getResourceUtilization(
    @Param('resourceId') resourceId: string,
    @Query() dateRange: DateRangeQueryDto,
  ) {
    const startDate = dateRange.startDate
      ? new Date(dateRange.startDate)
      : undefined;
    const endDate = dateRange.endDate ? new Date(dateRange.endDate) : undefined;

    return this.analyticsService.getResourceUtilization(
      resourceId,
      startDate,
      endDate,
    );
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue analytics' })
  @ApiQuery({
    name: 'tenantId',
    required: false,
    description: 'Filter by tenant ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns revenue metrics and breakdowns',
  })
  async getRevenueMetrics(
    @Query('tenantId') tenantId: string | undefined,
    @Query() dateRange: DateRangeQueryDto,
  ) {
    const startDate = dateRange.startDate
      ? new Date(dateRange.startDate)
      : undefined;
    const endDate = dateRange.endDate ? new Date(dateRange.endDate) : undefined;

    return this.analyticsService.getRevenueMetrics(
      tenantId,
      startDate,
      endDate,
    );
  }

  @Get('popular-times')
  @ApiOperation({ summary: 'Get popular booking times analysis' })
  @ApiQuery({
    name: 'resourceId',
    required: false,
    description: 'Filter by resource ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns popular times by day of week and hour',
  })
  async getPopularTimes(
    @Query('resourceId') resourceId: string | undefined,
    @Query() dateRange: DateRangeQueryDto,
  ) {
    const startDate = dateRange.startDate
      ? new Date(dateRange.startDate)
      : undefined;
    const endDate = dateRange.endDate ? new Date(dateRange.endDate) : undefined;

    return this.analyticsService.getPopularTimes(
      resourceId,
      startDate,
      endDate,
    );
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get booking trends and forecasts' })
  @ApiQuery({
    name: 'resourceId',
    required: false,
    description: 'Filter by resource ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns daily booking trends and growth metrics',
  })
  async getTrends(
    @Query('resourceId') resourceId: string | undefined,
    @Query() dateRange: DateRangeQueryDto,
  ) {
    const startDate = dateRange.startDate
      ? new Date(dateRange.startDate)
      : undefined;
    const endDate = dateRange.endDate ? new Date(dateRange.endDate) : undefined;

    return this.analyticsService.getTrends(resourceId, startDate, endDate);
  }
}
