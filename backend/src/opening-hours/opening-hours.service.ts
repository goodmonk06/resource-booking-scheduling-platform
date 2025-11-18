import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OpeningHoursService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.OpeningHoursCreateInput) {
    return this.prisma.openingHours.create({
      data,
      include: {
        resource: true,
        group: true,
      },
    });
  }

  async findAll(resourceId?: string, groupId?: string) {
    return this.prisma.openingHours.findMany({
      where: {
        ...(resourceId ? { resourceId } : {}),
        ...(groupId ? { groupId } : {}),
      },
      include: {
        resource: true,
        group: true,
      },
      orderBy: {
        weekday: 'asc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.openingHours.findUnique({
      where: { id },
      include: {
        resource: true,
        group: true,
      },
    });
  }

  async update(id: string, data: Prisma.OpeningHoursUpdateInput) {
    return this.prisma.openingHours.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.openingHours.delete({
      where: { id },
    });
  }

  async getResourceOpeningHours(resourceId: string) {
    // Get opening hours for the specific resource or its group
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        openingHours: true,
        group: {
          include: {
            openingHours: true,
          },
        },
      },
    });

    if (!resource) {
      return [];
    }

    // Resource-specific hours take precedence over group hours
    return resource.openingHours.length > 0
      ? resource.openingHours
      : resource.group.openingHours;
  }
}
