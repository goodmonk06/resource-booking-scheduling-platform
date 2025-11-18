import { Test, TestingModule } from '@nestjs/testing';
import { ResourcesService } from './resources.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ResourcesService', () => {
  let service: ResourcesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    resource: {
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
        ResourcesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ResourcesService>(ResourcesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of resources', async () => {
      const mockResources = [
        {
          id: '1',
          name: 'Conference Room A',
          description: 'Large conference room',
          capacity: 12,
          metaJson: null,
          isActive: true,
          groupId: 'group-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.resource.findMany.mockResolvedValue(mockResources);

      const result = await service.findAll();

      expect(result).toEqual(mockResources);
      expect(prisma.resource.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          group: true,
          openingHours: true,
          _count: {
            select: {
              reservations: true,
            },
          },
        },
      });
    });

    it('should filter by groupId when provided', async () => {
      const groupId = 'group-123';
      mockPrismaService.resource.findMany.mockResolvedValue([]);

      await service.findAll(groupId);

      expect(prisma.resource.findMany).toHaveBeenCalledWith({
        where: { groupId },
        include: expect.any(Object),
      });
    });

    it('should filter by isActive when provided', async () => {
      mockPrismaService.resource.findMany.mockResolvedValue([]);

      await service.findAll(undefined, true);

      expect(prisma.resource.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: expect.any(Object),
      });
    });
  });

  describe('findOne', () => {
    it('should return a single resource with relations', async () => {
      const mockResource = {
        id: '1',
        name: 'Conference Room A',
        description: 'Large conference room',
        capacity: 12,
        metaJson: null,
        isActive: true,
        groupId: 'group-1',
        group: {
          id: 'group-1',
          name: 'Meeting Rooms',
          type: 'ROOM',
          tenant: { id: 'tenant-1', name: 'Demo Tenant' },
        },
        openingHours: [],
        reservations: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.resource.findUnique.mockResolvedValue(mockResource);

      const result = await service.findOne('1');

      expect(result).toEqual(mockResource);
      expect(prisma.resource.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          group: {
            include: {
              tenant: true,
            },
          },
          openingHours: true,
          reservations: {
            where: {
              status: {
                in: ['CONFIRMED', 'PENDING'],
              },
            },
            orderBy: {
              startsAt: 'asc',
            },
          },
        },
      });
    });
  });

  describe('create', () => {
    it('should create a new resource', async () => {
      const createData = {
        name: 'New Room',
        description: 'Test room',
        capacity: 8,
        group: {
          connect: { id: 'group-1' },
        },
      };

      const mockCreatedResource = {
        id: 'new-id',
        ...createData,
        metaJson: null,
        isActive: true,
        groupId: 'group-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        group: { id: 'group-1', name: 'Rooms' },
        openingHours: [],
      };

      mockPrismaService.resource.create.mockResolvedValue(mockCreatedResource);

      const result = await service.create(createData);

      expect(result).toEqual(mockCreatedResource);
      expect(prisma.resource.create).toHaveBeenCalledWith({
        data: createData,
        include: {
          group: true,
          openingHours: true,
        },
      });
    });
  });

  describe('update', () => {
    it('should update a resource', async () => {
      const updateData = {
        name: 'Updated Room Name',
        capacity: 10,
      };

      const mockUpdatedResource = {
        id: '1',
        ...updateData,
        description: 'Test room',
        metaJson: null,
        isActive: true,
        groupId: 'group-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        group: { id: 'group-1', name: 'Rooms' },
        openingHours: [],
      };

      mockPrismaService.resource.update.mockResolvedValue(mockUpdatedResource);

      const result = await service.update('1', updateData);

      expect(result).toEqual(mockUpdatedResource);
      expect(prisma.resource.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateData,
        include: {
          group: true,
          openingHours: true,
        },
      });
    });
  });

  describe('remove', () => {
    it('should delete a resource', async () => {
      const mockDeletedResource = {
        id: '1',
        name: 'Deleted Room',
        description: null,
        capacity: null,
        metaJson: null,
        isActive: true,
        groupId: 'group-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.resource.delete.mockResolvedValue(mockDeletedResource);

      const result = await service.remove('1');

      expect(result).toEqual(mockDeletedResource);
      expect(prisma.resource.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });
  });
});
