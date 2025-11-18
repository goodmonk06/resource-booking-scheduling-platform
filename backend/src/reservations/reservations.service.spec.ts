import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsService } from './reservations.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReservationStatus } from '@prisma/client';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    reservation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a reservation when no conflicts exist', async () => {
      const createData = {
        resourceId: 'resource-1',
        userId: 'user-1',
        startsAt: new Date('2024-12-01T10:00:00Z'),
        endsAt: new Date('2024-12-01T11:00:00Z'),
        metaJson: { notes: 'Test booking' },
      };

      const mockCreatedReservation = {
        id: 'reservation-1',
        ...createData,
        status: ReservationStatus.PENDING,
        stripePaymentId: null,
        cancellationNote: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        resource: { id: 'resource-1', name: 'Room A' },
        user: { id: 'user-1', email: 'test@example.com' },
      };

      // Mock no conflicts
      mockPrismaService.reservation.findMany.mockResolvedValue([]);
      mockPrismaService.reservation.create.mockResolvedValue(
        mockCreatedReservation,
      );

      const result = await service.create(createData);

      expect(result).toEqual(mockCreatedReservation);
      expect(prisma.reservation.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when conflicts exist', async () => {
      const createData = {
        resourceId: 'resource-1',
        startsAt: new Date('2024-12-01T10:00:00Z'),
        endsAt: new Date('2024-12-01T11:00:00Z'),
      };

      // Mock conflict
      mockPrismaService.reservation.findMany.mockResolvedValue([
        {
          id: 'existing-reservation',
          resourceId: 'resource-1',
          startsAt: new Date('2024-12-01T10:30:00Z'),
          endsAt: new Date('2024-12-01T11:30:00Z'),
          status: ReservationStatus.CONFIRMED,
        },
      ]);

      await expect(service.create(createData)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return reservations with filters', async () => {
      const mockReservations = [
        {
          id: 'reservation-1',
          resourceId: 'resource-1',
          userId: 'user-1',
          startsAt: new Date(),
          endsAt: new Date(),
          status: ReservationStatus.CONFIRMED,
          metaJson: null,
          stripePaymentId: null,
          cancellationNote: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.reservation.findMany.mockResolvedValue(
        mockReservations,
      );

      const filters = {
        resourceId: 'resource-1',
        status: ReservationStatus.CONFIRMED,
      };

      const result = await service.findAll(filters);

      expect(result).toEqual(mockReservations);
      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            resourceId: 'resource-1',
            status: ReservationStatus.CONFIRMED,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a reservation by ID', async () => {
      const mockReservation = {
        id: 'reservation-1',
        resourceId: 'resource-1',
        userId: 'user-1',
        startsAt: new Date(),
        endsAt: new Date(),
        status: ReservationStatus.CONFIRMED,
        metaJson: null,
        stripePaymentId: null,
        cancellationNote: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        resource: {
          id: 'resource-1',
          name: 'Room A',
          group: { id: 'group-1', name: 'Meeting Rooms', tenant: {} },
        },
        user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
      };

      mockPrismaService.reservation.findUnique.mockResolvedValue(
        mockReservation,
      );

      const result = await service.findOne('reservation-1');

      expect(result).toEqual(mockReservation);
    });

    it('should throw NotFoundException when reservation not found', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('confirm', () => {
    it('should confirm a reservation', async () => {
      const mockConfirmedReservation = {
        id: 'reservation-1',
        status: ReservationStatus.CONFIRMED,
        stripePaymentId: 'pi_123',
        resource: {},
        user: {},
      };

      mockPrismaService.reservation.update.mockResolvedValue(
        mockConfirmedReservation,
      );

      const result = await service.confirm('reservation-1', 'pi_123');

      expect(result).toEqual(mockConfirmedReservation);
      expect(prisma.reservation.update).toHaveBeenCalledWith({
        where: { id: 'reservation-1' },
        data: {
          status: ReservationStatus.CONFIRMED,
          stripePaymentId: 'pi_123',
        },
        include: expect.any(Object),
      });
    });
  });

  describe('cancel', () => {
    it('should cancel a reservation', async () => {
      const mockCancelledReservation = {
        id: 'reservation-1',
        status: ReservationStatus.CANCELLED,
        cancellationNote: 'User cancelled',
        resource: {},
        user: {},
      };

      mockPrismaService.reservation.update.mockResolvedValue(
        mockCancelledReservation,
      );

      const result = await service.cancel('reservation-1', 'User cancelled');

      expect(result).toEqual(mockCancelledReservation);
      expect(prisma.reservation.update).toHaveBeenCalledWith({
        where: { id: 'reservation-1' },
        data: {
          status: ReservationStatus.CANCELLED,
          cancellationNote: 'User cancelled',
        },
        include: expect.any(Object),
      });
    });
  });

  describe('checkConflicts', () => {
    it('should detect overlapping reservations', async () => {
      const mockConflicts = [
        {
          id: 'conflict-1',
          resourceId: 'resource-1',
          startsAt: new Date('2024-12-01T10:00:00Z'),
          endsAt: new Date('2024-12-01T11:00:00Z'),
          status: ReservationStatus.CONFIRMED,
        },
      ];

      mockPrismaService.reservation.findMany.mockResolvedValue(mockConflicts);

      const conflicts = await service.checkConflicts(
        'resource-1',
        new Date('2024-12-01T10:30:00Z'),
        new Date('2024-12-01T11:30:00Z'),
      );

      expect(conflicts).toEqual(mockConflicts);
      expect(conflicts.length).toBeGreaterThan(0);
    });

    it('should return empty array when no conflicts', async () => {
      mockPrismaService.reservation.findMany.mockResolvedValue([]);

      const conflicts = await service.checkConflicts(
        'resource-1',
        new Date('2024-12-01T14:00:00Z'),
        new Date('2024-12-01T15:00:00Z'),
      );

      expect(conflicts).toEqual([]);
    });
  });
});
