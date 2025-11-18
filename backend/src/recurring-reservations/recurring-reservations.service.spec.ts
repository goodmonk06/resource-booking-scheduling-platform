import { Test, TestingModule } from '@nestjs/testing';
import { RecurringReservationsService } from './recurring-reservations.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../lib/logger.service';
import { MetricsService } from '../lib/metrics.service';
import { EventBus } from '../lib/events/domain-events';
import {
  RecurrencePattern,
  ReservationStatus,
} from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

describe('RecurringReservationsService', () => {
  let service: RecurringReservationsService;
  let prisma: PrismaService;
  let eventBus: EventBus;
  let metrics: MetricsService;

  const mockPrismaService = {
    reservation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    reservationRecurrence: {
      create: jest.fn(),
      update: jest.fn(),
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

  const mockEventBus = {
    publish: jest.fn(),
    on: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringReservationsService,
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
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<RecurringReservationsService>(
      RecurringReservationsService,
    );
    prisma = module.get<PrismaService>(PrismaService);
    eventBus = module.get<EventBus>(EventBus);
    metrics = module.get<MetricsService>(MetricsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const validData = {
      resourceId: 'resource-1',
      userId: 'user-1',
      startTime: '2024-01-01T10:00:00Z',
      endTime: '2024-01-01T11:00:00Z',
      pattern: RecurrencePattern.WEEKLY,
      interval: 1,
      daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
      occurrences: 5,
    };

    it('should create a recurring reservation series', async () => {
      const mockReservation = {
        id: 'reservation-1',
        resourceId: 'resource-1',
        userId: 'user-1',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T11:00:00Z'),
        status: ReservationStatus.CONFIRMED,
      };

      const mockRecurrence = {
        id: 'recurrence-1',
        reservationId: 'reservation-1',
        pattern: RecurrencePattern.WEEKLY,
        interval: 1,
        daysOfWeek: [1, 3, 5],
      };

      mockPrismaService.reservation.findMany.mockResolvedValue([]); // No conflicts
      mockPrismaService.reservation.create
        .mockResolvedValueOnce(mockReservation)
        .mockResolvedValue({ ...mockReservation, id: 'reservation-2' });
      mockPrismaService.reservationRecurrence.create.mockResolvedValue(
        mockRecurrence,
      );

      const result = await service.create(validData);

      expect(result).toHaveProperty('parentReservation');
      expect(result).toHaveProperty('recurrence');
      expect(result).toHaveProperty('instanceCount');
      expect(mockEventBus.publish).toHaveBeenCalled();
      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith(
        'recurring_reservations.created',
        expect.any(Object),
      );
    });

    it('should throw BadRequestException if neither endsAt nor occurrences is provided', async () => {
      const invalidData = { ...validData };
      delete invalidData.occurrences;

      await expect(service.create(invalidData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if WEEKLY pattern without daysOfWeek', async () => {
      const invalidData = {
        ...validData,
        daysOfWeek: undefined,
      };

      await expect(service.create(invalidData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if MONTHLY pattern without dayOfMonth', async () => {
      const invalidData = {
        ...validData,
        pattern: RecurrencePattern.MONTHLY,
        daysOfWeek: undefined,
        dayOfMonth: undefined,
      };

      await expect(service.create(invalidData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if startTime >= endTime', async () => {
      const invalidData = {
        ...validData,
        startTime: '2024-01-01T11:00:00Z',
        endTime: '2024-01-01T10:00:00Z',
      };

      await expect(service.create(invalidData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException if any instance has a conflict', async () => {
      const conflictingReservation = {
        id: 'conflict-1',
        resourceId: 'resource-1',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T11:00:00Z'),
        status: ReservationStatus.CONFIRMED,
      };

      mockPrismaService.reservation.findMany.mockResolvedValue([
        conflictingReservation,
      ]);

      await expect(service.create(validData)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should generate correct instances for DAILY pattern', async () => {
      const dailyData = {
        ...validData,
        pattern: RecurrencePattern.DAILY,
        interval: 2,
        daysOfWeek: undefined,
        occurrences: 3,
      };

      mockPrismaService.reservation.findMany.mockResolvedValue([]); // No conflicts
      mockPrismaService.reservation.create.mockResolvedValue({
        id: 'reservation-1',
        resourceId: 'resource-1',
        userId: 'user-1',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T11:00:00Z'),
        status: ReservationStatus.CONFIRMED,
      });
      mockPrismaService.reservationRecurrence.create.mockResolvedValue({
        id: 'recurrence-1',
        reservationId: 'reservation-1',
        pattern: RecurrencePattern.DAILY,
      });

      const result = await service.create(dailyData);

      // Should create 3 instances (every 2 days)
      expect(result.instanceCount).toBe(3);
    });

    it('should generate correct instances for MONTHLY pattern', async () => {
      const monthlyData = {
        ...validData,
        pattern: RecurrencePattern.MONTHLY,
        interval: 1,
        daysOfWeek: undefined,
        dayOfMonth: 15,
        occurrences: 3,
      };

      mockPrismaService.reservation.findMany.mockResolvedValue([]);
      mockPrismaService.reservation.create.mockResolvedValue({
        id: 'reservation-1',
        resourceId: 'resource-1',
        userId: 'user-1',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
        status: ReservationStatus.CONFIRMED,
      });
      mockPrismaService.reservationRecurrence.create.mockResolvedValue({
        id: 'recurrence-1',
        reservationId: 'reservation-1',
        pattern: RecurrencePattern.MONTHLY,
      });

      const result = await service.create(monthlyData);

      expect(result.instanceCount).toBe(3);
    });
  });

  describe('findOne', () => {
    it('should return recurring reservation with all instances', async () => {
      const mockReservation = {
        id: 'reservation-1',
        recurrence: {
          id: 'recurrence-1',
          pattern: RecurrencePattern.WEEKLY,
        },
        resource: { id: 'resource-1', name: 'Meeting Room' },
        user: { id: 'user-1', name: 'John Doe' },
      };

      const mockInstances = [
        { id: 'reservation-1', startTime: new Date('2024-01-01T10:00:00Z') },
        { id: 'reservation-2', startTime: new Date('2024-01-08T10:00:00Z') },
        { id: 'reservation-3', startTime: new Date('2024-01-15T10:00:00Z') },
      ];

      mockPrismaService.reservation.findUnique.mockResolvedValue(
        mockReservation,
      );
      mockPrismaService.reservation.findMany.mockResolvedValue(mockInstances);

      const result = await service.findOne('reservation-1');

      expect(result).toHaveProperty('parent');
      expect(result).toHaveProperty('recurrence');
      expect(result).toHaveProperty('instances');
      expect(result.totalInstances).toBe(3);
    });

    it('should throw NotFoundException if recurring reservation not found', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if reservation has no recurrence', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue({
        id: 'reservation-1',
        recurrence: null,
      });

      await expect(service.findOne('reservation-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update recurring reservation', async () => {
      const mockReservation = {
        id: 'reservation-1',
        recurrence: {
          id: 'recurrence-1',
          pattern: RecurrencePattern.WEEKLY,
          exceptions: [],
        },
      };

      const updatedRecurrence = {
        id: 'recurrence-1',
        pattern: RecurrencePattern.DAILY,
        interval: 2,
      };

      mockPrismaService.reservation.findUnique.mockResolvedValue(
        mockReservation,
      );
      mockPrismaService.reservationRecurrence.update.mockResolvedValue(
        updatedRecurrence,
      );

      const result = await service.update('reservation-1', {
        pattern: RecurrencePattern.DAILY,
        interval: 2,
      });

      expect(result).toEqual(updatedRecurrence);
      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith(
        'recurring_reservations.updated',
      );
    });

    it('should add exceptions when provided', async () => {
      const mockReservation = {
        id: 'reservation-1',
        recurrence: {
          id: 'recurrence-1',
          pattern: RecurrencePattern.WEEKLY,
          exceptions: [new Date('2024-01-08T10:00:00Z')],
        },
      };

      mockPrismaService.reservation.findUnique.mockResolvedValue(
        mockReservation,
      );
      mockPrismaService.reservationRecurrence.update.mockResolvedValue({
        id: 'recurrence-1',
        exceptions: [
          new Date('2024-01-08T10:00:00Z'),
          new Date('2024-01-15T10:00:00Z'),
        ],
      });

      const result = await service.update('reservation-1', {
        addExceptions: ['2024-01-15T10:00:00Z'],
      });

      expect(mockPrismaService.reservationRecurrence.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if recurring reservation not found', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue(null);

      await expect(
        service.update('invalid-id', { interval: 2 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelInstance', () => {
    it('should cancel a single instance', async () => {
      const mockInstance = {
        id: 'reservation-2',
        startTime: new Date('2024-01-08T10:00:00Z'),
        status: ReservationStatus.CONFIRMED,
      };

      const cancelledInstance = {
        ...mockInstance,
        status: ReservationStatus.CANCELLED,
      };

      mockPrismaService.reservation.findMany.mockResolvedValue([mockInstance]);
      mockPrismaService.reservation.update.mockResolvedValue(
        cancelledInstance,
      );

      const result = await service.cancelInstance(
        'reservation-1',
        '2024-01-08T10:00:00Z',
      );

      expect(result.status).toBe(ReservationStatus.CANCELLED);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'reservation.cancelled',
        }),
      );
      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith(
        'recurring_reservations.instance_cancelled',
      );
    });

    it('should throw NotFoundException if instance not found', async () => {
      mockPrismaService.reservation.findMany.mockResolvedValue([]);

      await expect(
        service.cancelInstance('reservation-1', '2024-01-08T10:00:00Z'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelSeries', () => {
    it('should cancel all future instances', async () => {
      const mockInstances = [
        {
          id: 'reservation-1',
          startTime: new Date(Date.now() + 86400000),
          status: ReservationStatus.CONFIRMED,
        },
        {
          id: 'reservation-2',
          startTime: new Date(Date.now() + 2 * 86400000),
          status: ReservationStatus.CONFIRMED,
        },
      ];

      mockPrismaService.reservation.findMany.mockResolvedValue(mockInstances);
      mockPrismaService.reservation.updateMany.mockResolvedValue({
        count: 2,
      });

      const result = await service.cancelSeries('reservation-1');

      expect(result.cancelledCount).toBe(2);
      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith(
        'recurring_reservations.series_cancelled',
        expect.objectContaining({
          instanceCount: '2',
        }),
      );
    });
  });

  describe('findByUser', () => {
    it('should return all recurring reservations for a user', async () => {
      const mockReservations = [
        {
          id: 'reservation-1',
          userId: 'user-1',
          recurrence: { id: 'recurrence-1' },
          resource: { id: 'resource-1', name: 'Meeting Room' },
        },
        {
          id: 'reservation-2',
          userId: 'user-1',
          recurrence: { id: 'recurrence-2' },
          resource: { id: 'resource-2', name: 'Conference Room' },
        },
      ];

      mockPrismaService.reservation.findMany.mockResolvedValue(
        mockReservations,
      );

      const result = await service.findByUser('user-1');

      expect(result).toEqual(mockReservations);
      expect(result).toHaveLength(2);
    });
  });

  describe('findByResource', () => {
    it('should return all recurring reservations for a resource', async () => {
      const mockReservations = [
        {
          id: 'reservation-1',
          resourceId: 'resource-1',
          recurrence: { id: 'recurrence-1' },
          user: { id: 'user-1', name: 'John Doe', email: 'john@example.com' },
        },
      ];

      mockPrismaService.reservation.findMany.mockResolvedValue(
        mockReservations,
      );

      const result = await service.findByResource('resource-1');

      expect(result).toEqual(mockReservations);
      expect(result).toHaveLength(1);
    });
  });
});
