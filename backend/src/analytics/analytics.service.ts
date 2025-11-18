import { Injectable } from '@nestjs/common';
import { ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../lib/logger.service';
import { MetricsService } from '../lib/metrics.service';

interface UtilizationMetrics {
  resourceId: string;
  resourceName: string;
  totalBookedHours: number;
  totalAvailableHours: number;
  utilizationRate: number;
  bookingCount: number;
  averageBookingDuration: number;
  peakHours: { hour: number; count: number }[];
}

interface RevenueMetrics {
  totalRevenue: number;
  completedBookings: number;
  averageBookingValue: number;
  revenueByResource: {
    resourceId: string;
    resourceName: string;
    revenue: number;
    bookingCount: number;
  }[];
  revenueByMonth: {
    month: string;
    revenue: number;
    bookingCount: number;
  }[];
}

interface PopularTimesMetrics {
  byDayOfWeek: {
    dayOfWeek: number;
    dayName: string;
    bookingCount: number;
    averageOccupancy: number;
  }[];
  byHourOfDay: {
    hour: number;
    bookingCount: number;
    averageOccupancy: number;
  }[];
  peakDays: string[];
  peakHours: number[];
}

interface TrendMetrics {
  dailyBookings: {
    date: string;
    count: number;
    revenue: number;
  }[];
  growthRate: number;
  forecastNextMonth: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private metrics: MetricsService,
  ) {
    this.logger.setContext('AnalyticsService');
  }

  /**
   * Get resource utilization metrics
   */
  async getResourceUtilization(
    resourceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<UtilizationMetrics> {
    this.logger.info('Calculating resource utilization', { resourceId });

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        openingHours: true,
      },
    });

    if (!resource) {
      throw new Error('Resource not found');
    }

    const reservations = await this.prisma.reservation.findMany({
      where: {
        resourceId,
        status: {
          in: [ReservationStatus.CONFIRMED, ReservationStatus.COMPLETED],
        },
        startTime: {
          gte: start,
          lte: end,
        },
      },
    });

    // Calculate total booked hours
    const totalBookedMs = reservations.reduce((sum, res) => {
      return sum + (res.endTime.getTime() - res.startTime.getTime());
    }, 0);
    const totalBookedHours = totalBookedMs / (1000 * 60 * 60);

    // Calculate total available hours (simplified - assumes 8-hour days)
    const daysDiff = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    const totalAvailableHours = daysDiff * 8; // 8 hours per day

    // Calculate average booking duration
    const averageBookingDuration =
      reservations.length > 0 ? totalBookedHours / reservations.length : 0;

    // Calculate peak hours
    const hourCounts = new Map<number, number>();
    reservations.forEach((res) => {
      const hour = res.startTime.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    const peakHours = Array.from(hourCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const utilizationRate =
      totalAvailableHours > 0
        ? (totalBookedHours / totalAvailableHours) * 100
        : 0;

    this.metrics.setGauge('analytics.utilization_rate', utilizationRate, {
      resourceId,
    });

    return {
      resourceId,
      resourceName: resource.name,
      totalBookedHours: Math.round(totalBookedHours * 100) / 100,
      totalAvailableHours,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      bookingCount: reservations.length,
      averageBookingDuration: Math.round(averageBookingDuration * 100) / 100,
      peakHours,
    };
  }

  /**
   * Get revenue analytics
   */
  async getRevenueMetrics(
    tenantId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<RevenueMetrics> {
    this.logger.info('Calculating revenue metrics', { tenantId });

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const where: any = {
      status: {
        in: [ReservationStatus.CONFIRMED, ReservationStatus.COMPLETED],
      },
      startTime: {
        gte: start,
        lte: end,
      },
    };

    if (tenantId) {
      where.resource = {
        group: {
          tenantId,
        },
      };
    }

    const reservations = await this.prisma.reservation.findMany({
      where,
      include: {
        resource: {
          include: {
            group: true,
          },
        },
      },
    });

    // Calculate total revenue from metaJson price field
    const totalRevenue = reservations.reduce((sum, res) => {
      const price = res.metaJson?.price || 0;
      return sum + price;
    }, 0);

    const completedBookings = reservations.length;
    const averageBookingValue =
      completedBookings > 0 ? totalRevenue / completedBookings : 0;

    // Revenue by resource
    const revenueByResourceMap = new Map<
      string,
      { resourceId: string; resourceName: string; revenue: number; count: number }
    >();

    reservations.forEach((res) => {
      const existing = revenueByResourceMap.get(res.resourceId) || {
        resourceId: res.resourceId,
        resourceName: res.resource.name,
        revenue: 0,
        count: 0,
      };
      existing.revenue += res.metaJson?.price || 0;
      existing.count += 1;
      revenueByResourceMap.set(res.resourceId, existing);
    });

    const revenueByResource = Array.from(revenueByResourceMap.values())
      .map((r) => ({
        resourceId: r.resourceId,
        resourceName: r.resourceName,
        revenue: Math.round(r.revenue * 100) / 100,
        bookingCount: r.count,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Revenue by month
    const revenueByMonthMap = new Map<
      string,
      { revenue: number; count: number }
    >();

    reservations.forEach((res) => {
      const monthKey = `${res.startTime.getFullYear()}-${String(res.startTime.getMonth() + 1).padStart(2, '0')}`;
      const existing = revenueByMonthMap.get(monthKey) || {
        revenue: 0,
        count: 0,
      };
      existing.revenue += res.metaJson?.price || 0;
      existing.count += 1;
      revenueByMonthMap.set(monthKey, existing);
    });

    const revenueByMonth = Array.from(revenueByMonthMap.entries())
      .map(([month, data]) => ({
        month,
        revenue: Math.round(data.revenue * 100) / 100,
        bookingCount: data.count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    this.metrics.setGauge('analytics.total_revenue', totalRevenue);

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      completedBookings,
      averageBookingValue: Math.round(averageBookingValue * 100) / 100,
      revenueByResource,
      revenueByMonth,
    };
  }

  /**
   * Get popular times analytics
   */
  async getPopularTimes(
    resourceId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<PopularTimesMetrics> {
    this.logger.info('Calculating popular times', { resourceId });

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const where: any = {
      status: {
        in: [ReservationStatus.CONFIRMED, ReservationStatus.COMPLETED],
      },
      startTime: {
        gte: start,
        lte: end,
      },
    };

    if (resourceId) {
      where.resourceId = resourceId;
    }

    const reservations = await this.prisma.reservation.findMany({
      where,
    });

    // By day of week
    const dayOfWeekMap = new Map<number, number>();
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    reservations.forEach((res) => {
      const dayOfWeek = res.startTime.getDay();
      dayOfWeekMap.set(dayOfWeek, (dayOfWeekMap.get(dayOfWeek) || 0) + 1);
    });

    const totalBookings = reservations.length;
    const byDayOfWeek = Array.from(dayOfWeekMap.entries())
      .map(([dayOfWeek, count]) => ({
        dayOfWeek,
        dayName: dayNames[dayOfWeek],
        bookingCount: count,
        averageOccupancy:
          totalBookings > 0
            ? Math.round((count / totalBookings) * 100 * 100) / 100
            : 0,
      }))
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek);

    // By hour of day
    const hourOfDayMap = new Map<number, number>();

    reservations.forEach((res) => {
      const hour = res.startTime.getHours();
      hourOfDayMap.set(hour, (hourOfDayMap.get(hour) || 0) + 1);
    });

    const byHourOfDay = Array.from(hourOfDayMap.entries())
      .map(([hour, count]) => ({
        hour,
        bookingCount: count,
        averageOccupancy:
          totalBookings > 0
            ? Math.round((count / totalBookings) * 100 * 100) / 100
            : 0,
      }))
      .sort((a, b) => a.hour - b.hour);

    // Peak days (top 3 days with most bookings)
    const peakDays = byDayOfWeek
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .slice(0, 3)
      .map((d) => d.dayName);

    // Peak hours (top 3 hours with most bookings)
    const peakHours = byHourOfDay
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .slice(0, 3)
      .map((h) => h.hour);

    return {
      byDayOfWeek,
      byHourOfDay,
      peakDays,
      peakHours,
    };
  }

  /**
   * Get booking trends
   */
  async getTrends(
    resourceId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<TrendMetrics> {
    this.logger.info('Calculating booking trends', { resourceId });

    const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const where: any = {
      status: {
        in: [ReservationStatus.CONFIRMED, ReservationStatus.COMPLETED],
      },
      startTime: {
        gte: start,
        lte: end,
      },
    };

    if (resourceId) {
      where.resourceId = resourceId;
    }

    const reservations = await this.prisma.reservation.findMany({
      where,
    });

    // Daily bookings
    const dailyMap = new Map<string, { count: number; revenue: number }>();

    reservations.forEach((res) => {
      const dateKey = res.startTime.toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey) || { count: 0, revenue: 0 };
      existing.count += 1;
      existing.revenue += res.metaJson?.price || 0;
      dailyMap.set(dateKey, existing);
    });

    const dailyBookings = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        count: data.count,
        revenue: Math.round(data.revenue * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate growth rate (simple linear regression)
    const counts = dailyBookings.map((d) => d.count);
    const avgCount = counts.length > 0
      ? counts.reduce((sum, c) => sum + c, 0) / counts.length
      : 0;

    // Simple growth calculation: compare first half vs second half
    const midpoint = Math.floor(counts.length / 2);
    const firstHalfAvg =
      midpoint > 0
        ? counts.slice(0, midpoint).reduce((sum, c) => sum + c, 0) / midpoint
        : 0;
    const secondHalfAvg =
      counts.length - midpoint > 0
        ? counts
            .slice(midpoint)
            .reduce((sum, c) => sum + c, 0) /
          (counts.length - midpoint)
        : 0;

    const growthRate =
      firstHalfAvg > 0
        ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100
        : 0;

    // Forecast next month (simple average-based)
    const forecastNextMonth = Math.round(avgCount * 30);

    return {
      dailyBookings,
      growthRate: Math.round(growthRate * 100) / 100,
      forecastNextMonth,
    };
  }

  /**
   * Get dashboard summary
   */
  async getDashboardSummary(tenantId?: string) {
    this.logger.info('Generating dashboard summary', { tenantId });

    const where: any = {};
    if (tenantId) {
      where.resource = {
        group: {
          tenantId,
        },
      };
    }

    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalReservations,
      activeReservations,
      completedReservations,
      cancelledReservations,
      recentReservations,
    ] = await Promise.all([
      this.prisma.reservation.count({ where }),
      this.prisma.reservation.count({
        where: {
          ...where,
          status: ReservationStatus.CONFIRMED,
          startTime: { gte: now },
        },
      }),
      this.prisma.reservation.count({
        where: {
          ...where,
          status: ReservationStatus.COMPLETED,
        },
      }),
      this.prisma.reservation.count({
        where: {
          ...where,
          status: ReservationStatus.CANCELLED,
        },
      }),
      this.prisma.reservation.count({
        where: {
          ...where,
          createdAt: { gte: last30Days },
        },
      }),
    ]);

    return {
      totalReservations,
      activeReservations,
      completedReservations,
      cancelledReservations,
      recentReservations,
      cancellationRate:
        totalReservations > 0
          ? Math.round(
              (cancelledReservations / totalReservations) * 100 * 100,
            ) / 100
          : 0,
    };
  }
}
