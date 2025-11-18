import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ResourcesService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.ResourceCreateInput) {
    return this.prisma.resource.create({
      data,
      include: {
        group: true,
        openingHours: true,
      },
    });
  }

  async findAll(groupId?: string, isActive?: boolean) {
    return this.prisma.resource.findMany({
      where: {
        ...(groupId ? { groupId } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
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
  }

  async findOne(id: string) {
    return this.prisma.resource.findUnique({
      where: { id },
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
  }

  async update(id: string, data: Prisma.ResourceUpdateInput) {
    return this.prisma.resource.update({
      where: { id },
      data,
      include: {
        group: true,
        openingHours: true,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.resource.delete({
      where: { id },
    });
  }
}
