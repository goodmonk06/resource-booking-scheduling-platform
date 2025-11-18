import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ResourceGroupsService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.ResourceGroupCreateInput) {
    return this.prisma.resourceGroup.create({
      data,
      include: {
        resources: true,
        openingHours: true,
      },
    });
  }

  async findAll(tenantId?: string) {
    return this.prisma.resourceGroup.findMany({
      where: tenantId ? { tenantId } : undefined,
      include: {
        resources: true,
        openingHours: true,
        _count: {
          select: {
            resources: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.resourceGroup.findUnique({
      where: { id },
      include: {
        resources: true,
        openingHours: true,
        tenant: true,
      },
    });
  }

  async update(id: string, data: Prisma.ResourceGroupUpdateInput) {
    return this.prisma.resourceGroup.update({
      where: { id },
      data,
      include: {
        resources: true,
        openingHours: true,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.resourceGroup.delete({
      where: { id },
    });
  }
}
