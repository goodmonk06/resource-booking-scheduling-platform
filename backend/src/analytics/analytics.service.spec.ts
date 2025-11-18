import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../lib/logger.service';
import { MetricsService } from '../lib/metrics.service';
import { ReservationStatus } from '@prisma/client';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    resource: {
      findUnique: jest.fn(),
    },
    reservation: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockLoggerService = {
    setContext: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  const mockMetricsService = {
    incrementCounter: jest.fn(),
    setGauge: jest.fn(),
    recordHistogram: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getResourceUtilization', () => {
    it('should calculate utilization metrics correctly', async () => {
      const mockResource = {
        id: 'resource-1',
        name: 'Meeting Room A',
        openingHours: [],
      };

      const mockReservations = [
        {
          id: 'res-1',
          resourceId: 'resource-1',
          startTime: new Date('2024-01-01T10:00:00Z'),
          endTime: new Date('2024-01-01T11:00:00Z'),
          status: ReservationStatus.CONFIRMED,
        },
        {
          id: 'res-2',
          resourceId: 'resource-1',
          startTime: new Date('2024-01-01T14:00:00Z'),
          endTime: new Date('2024-01-01T16:00:00Z'),
          status: ReservationStatus.CONFIRMED,
        },
        {
          id: 'res-3',
          resourceId: 'resource-1',
          startTime: new Date('2024-01-02T10:00:00Z'),
          endTime: new Date('2024-01-02T11:00:00Z'),
          status: ReservationStatus.CONFIRMED,
        },
      ];

      mockPrismaService.resource.findUnique.mockResolvedValue(mockResource);
      mockPrismaService.reservation.findMany.mockResolvedValue(
        mockReservations,
      );

      const result = await service.getResourceUtilization('resource-1');

      expect(result).toHaveProperty('resourceId', 'resource-1');
      expect(result).toHaveProperty('resourceName', 'Meeting Room A');
      expect(result).toHaveProperty('totalBookedHours');
      expect(result).toHaveProperty('totalAvailableHours');
      expect(result).toHaveProperty('utilizationRate');
      expect(result).toHaveProperty('bookingCount', 3);
      expect(result).toHaveProperty('averageBookingDuration');
      expect(result).toHaveProperty('peakHours');
      expect(result.totalBookedHours).toBe(4); // 1 + 2 + 1 hours
    });

    it('should handle zero bookings', async () => {
      const mockResource = {
        id: 'resource-1',
        name: 'Meeting Room A',
        openingHours: [],
      };

      mockPrismaService.resource.findUnique.mockResolvedValue(mockResource);
      mockPrismaService.reservation.findMany.mockResolvedValue([]);

      const result = await service.getResourceUtilization('resource-1');

      expect(result.totalBookedHours).toBe(0);
      expect(result.bookingCount).toBe(0);
      expect(result.averageBookingDuration).toBe(0);
      expect(result.peakHours).toEqual([]);
    });

    it('should throw error if resource not found', async () => {
      mockPrismaService.resource.findUnique.mockResolvedValue(null);

      await expect(
        service.getResourceUtilization('invalid-id'),
      ).rejects.toThrow('Resource not found');
    });
  });

  describe('getRevenueMetrics', () => {
    it('should calculate revenue metrics correctly', async () => {
      const mockReservations = [
        {
          id: 'res-1',
          resourceId: 'resource-1',
          startTime: new Date('2024-01-01T10:00:00Z'),
          status: ReservationStatus.CONFIRMED,
          metaJson: { price: 100 },
          resource: {
            id: 'resource-1',
            name: 'Meeting Room A',
            group: { tenantId: 'tenant-1' },
          },
        },
        {
          id: 'res-2',
          resourceId: 'resource-1',
          startTime: new Date('2024-01-15T10:00:00Z'),
          status: ReservationStatus.COMPLETED,
          metaJson: { price: 150 },
          resource: {
            id: 'resource-1',
            name: 'Meeting Room A',
            group: { tenantId: 'tenant-1' },
          },
        },
        {
          id: 'res-3',
          resourceId: 'resource-2',
          startTime: new Date('2024-02-01T10:00:00Z'),
          status: ReservationStatus.COMPLETED,
          metaJson: { price: 200 },
          resource: {
            id: 'resource-2',
            name: 'Conference Room',
            group: { tenantId: 'tenant-1' },
          },
        },
      ];

      mockPrismaService.reservation.findMany.mockResolvedValue(
        mockReservations,
      );

      const result = await service.getRevenueMetrics();

      expect(result).toHaveProperty('totalRevenue', 450);
      expect(result).toHaveProperty('completedBookings', 3);
      expect(result).toHaveProperty('averageBookingValue', 150);
      expect(result).toHaveProperty('revenueByResource');
      expect(result).toHaveProperty('revenueByMonth');
      expect(result.revenueByResource).toHaveLength(2);
      expect(result.revenueByMonth).toHaveLength(2);
    });

    it('should handle reservations without price', async () => {
      const mockReservations = [
        {
          id: 'res-1',
          resourceId: 'resource-1',
          startTime: new Date('2024-01-01T10:00:00Z'),
          status: ReservationStatus.CONFIRMED,
          metaJson: {},
          resource: {
            id: 'resource-1',
            name: 'Meeting Room A',
            group: { tenantId: 'tenant-1' },
          },
        },
      ];

      mockPrismaService.reservation.findMany.mockResolvedValue(
        mockReservations,
      );

      const result = await service.getRevenueMetrics();

      expect(result.totalRevenue).toBe(0);
      expect(result.averageBookingValue).toBe(0);
    });
  });

  describe('getPopularTimes', () => {
    it('should calculate popular times correctly', async () => {
      const mockReservations = [
        {
          id: 'res-1',
          startTime: new Date('2024-01-01T10:00:00Z'), // Monday 10am
          status: ReservationStatus.CONFIRMED,
        },
        {
          id: 'res-2',
          startTime: new Date('2024-01-01T14:00:00Z'), // Monday 2pm
          status: ReservationStatus.CONFIRMED,
        },
        {
          id: 'res-3',
          startTime: new Date('2024-01-03T10:00:00Z'), // Wednesday 10am
          status: ReservationStatus.CONFIRMED,
        },
        {
          id: 'res-4',
          startTime: new Date('2024-01-05T10:00:00Z'), // Friday 10am
          status: ReservationStatus.CONFIRMED,
        },
      ];

      mockPrismaService.reservation.findMany.mockResolvedValue(
        mockReservations,
      );

      const result = await service.getPopularTimes();

      expect(result).toHaveProperty('byDayOfWeek');
      expect(result).toHaveProperty('byHourOfDay');
      expect(result).toHaveProperty('peakDays');
      expect(result).toHaveProperty('peakHours');
      expect(result.byDayOfWeek.length).toBeGreaterThan(0);
      expect(result.byHourOfDay.length).toBeGreaterThan(0);
      expect(result.peakHours).toContain(10); // 10am is most popular
    });

    it('should handle empty reservations', async () => {
      mockPrismaService.reservation.findMany.mockResolvedValue([]);

      const result = await service.getPopularTimes();

      expect(result.byDayOfWeek).toEqual([]);
      expect(result.byHourOfDay).toEqual([]);
      expect(result.peakDays).toEqual([]);
      expect(result.peakHours).toEqual([]);
    });
  });

  describe('getTrends', () => {
    it('should calculate booking trends', async () => {
      const mockReservations = [
        {
          id: 'res-1',
          startTime: new Date('2024-01-01T10:00:00Z'),
          status: ReservationStatus.CONFIRMED,
          metaJson: { price: 100 },
        },
        {
          id: 'res-2',
          startTime: new Date('2024-01-02T10:00:00Z'),
          status: ReservationStatus.CONFIRMED,
          metaJson: { price: 150 },
        },
        {
          id: 'res-3',
          startTime: new Date('2024-01-03T10:00:00Z'),
          status: ReservationStatus.CONFIRMED,
          metaJson: { price: 200 },
        },
      ];

      mockPrismaService.reservation.findMany.mockResolvedValue(
        mockReservations,
      );

      const result = await service.getTrends();

      expect(result).toHaveProperty('dailyBookings');
      expect(result).toHaveProperty('growthRate');
      expect(result).toHaveProperty('forecastNextMonth');
      expect(result.dailyBookings).toHaveLength(3);
    });

    it('should handle zero bookings for trends', async () => {
      mockPrismaService.reservation.findMany.mockResolvedValue([]);

      const result = await service.getTrends();

      expect(result.dailyBookings).toEqual([]);
      expect(result.growthRate).toBe(0);
      expect(result.forecastNextMonth).toBe(0);
    });
  });

  describe('getDashboardSummary', () => {
    it('should return dashboard summary', async () => {
      mockPrismaService.reservation.count
        .mockResolvedValueOnce(100) // totalReservations
        .mockResolvedValueOnce(25) // activeReservations
        .mockResolvedValueOnce(60) // completedReservations
        .mockResolvedValueOnce(15) // cancelledReservations
        .mockResolvedValueOnce(30); // recentReservations

      const result = await service.getDashboardSummary();

      expect(result).toHaveProperty('totalReservations', 100);
      expect(result).toHaveProperty('activeReservations', 25);
      expect(result).toHaveProperty('completedReservations', 60);
      expect(result).toHaveProperty('cancelledReservations', 15);
      expect(result).toHaveProperty('recentReservations', 30);
      expect(result).toHaveProperty('cancellationRate', 15);
    });

    it('should handle zero reservations', async () => {
      mockPrismaService.reservation.count.mockResolvedValue(0);

      const result = await service.getDashboardSummary();

      expect(result.totalReservations).toBe(0);
      expect(result.cancellationRate).toBe(0);
    });
  });
});
