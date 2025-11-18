import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '../prisma/prisma.service';
import { OpeningHoursService } from '../opening-hours/opening-hours.service';
import { ReservationsService } from '../reservations/reservations.service';

describe('AvailabilityService', () => {
  let service: AvailabilityService;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockPrismaService = {
    resource: {
      findUnique: jest.fn(),
    },
  };

  const mockOpeningHoursService = {
    getResourceOpeningHours: jest.fn(),
  };

  const mockReservationsService = {
    findAll: jest.fn(),
    checkConflicts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: OpeningHoursService,
          useValue: mockOpeningHoursService,
        },
        {
          provide: ReservationsService,
          useValue: mockReservationsService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAvailableSlots', () => {
    it('should return cached slots if available', async () => {
      const cachedSlots = [
        {
          startsAt: '2024-12-01T10:00:00Z',
          endsAt: '2024-12-01T11:00:00Z',
          durationMinutes: 60,
        },
      ];

      mockCacheManager.get.mockResolvedValue(cachedSlots);

      const result = await service.getAvailableSlots(
        'resource-1',
        new Date('2024-12-01'),
        new Date('2024-12-01'),
        60,
        30,
      );

      expect(result).toEqual(cachedSlots);
      expect(mockCacheManager.get).toHaveBeenCalled();
    });

    it('should return empty array when no opening hours exist', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockOpeningHoursService.getResourceOpeningHours.mockResolvedValue([]);

      const result = await service.getAvailableSlots(
        'resource-1',
        new Date('2024-12-01'),
        new Date('2024-12-01'),
        60,
        30,
      );

      expect(result).toEqual([]);
    });

    it('should generate slots based on opening hours and exclude conflicts', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      // Mock opening hours (Monday 9am-5pm, weekday = 1)
      mockOpeningHoursService.getResourceOpeningHours.mockResolvedValue([
        {
          id: 'oh-1',
          weekday: 1, // Monday
          startTime: '09:00',
          endTime: '17:00',
          resourceId: 'resource-1',
        },
      ]);

      // Mock no reservations
      mockReservationsService.findAll.mockResolvedValue([]);

      // Test with a Monday
      const monday = new Date('2024-12-02T00:00:00Z'); // This is a Monday
      const result = await service.getAvailableSlots(
        'resource-1',
        monday,
        monday,
        60, // 1 hour duration
        30, // 30 minute intervals
      );

      expect(result.length).toBeGreaterThan(0);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });

  describe('checkAvailability', () => {
    it('should return false if not within opening hours', async () => {
      mockOpeningHoursService.getResourceOpeningHours.mockResolvedValue([
        {
          weekday: 1, // Monday
          startTime: '09:00',
          endTime: '17:00',
        },
      ]);

      // Check Sunday (weekday 0)
      const sunday = new Date('2024-12-01T10:00:00Z');
      const result = await service.checkAvailability(
        'resource-1',
        sunday,
        new Date('2024-12-01T11:00:00Z'),
      );

      expect(result).toBe(false);
    });

    it('should return false if conflicts exist', async () => {
      mockOpeningHoursService.getResourceOpeningHours.mockResolvedValue([
        {
          weekday: 1, // Monday
          startTime: '09:00',
          endTime: '17:00',
        },
      ]);

      mockReservationsService.checkConflicts.mockResolvedValue([
        {
          id: 'conflict-1',
          startsAt: new Date('2024-12-02T10:00:00Z'),
          endsAt: new Date('2024-12-02T11:00:00Z'),
        },
      ]);

      const monday = new Date('2024-12-02T10:30:00Z');
      const result = await service.checkAvailability(
        'resource-1',
        monday,
        new Date('2024-12-02T11:30:00Z'),
      );

      expect(result).toBe(false);
    });

    it('should return true if available and no conflicts', async () => {
      mockOpeningHoursService.getResourceOpeningHours.mockResolvedValue([
        {
          weekday: 1, // Monday
          startTime: '09:00',
          endTime: '17:00',
        },
      ]);

      mockReservationsService.checkConflicts.mockResolvedValue([]);

      const monday = new Date('2024-12-02T10:00:00Z');
      const result = await service.checkAvailability(
        'resource-1',
        monday,
        new Date('2024-12-02T11:00:00Z'),
      );

      expect(result).toBe(true);
    });
  });
});
