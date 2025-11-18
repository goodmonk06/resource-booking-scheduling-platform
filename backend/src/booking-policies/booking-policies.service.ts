import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BookingPoliciesService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.BookingPolicyCreateInput) {
    return this.prisma.bookingPolicy.create({
      data,
      include: {
        tenant: true,
      },
    });
  }

  async findAll(tenantId?: string) {
    return this.prisma.bookingPolicy.findMany({
      where: tenantId ? { tenantId } : undefined,
      include: {
        tenant: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.bookingPolicy.findUnique({
      where: { id },
      include: {
        tenant: true,
      },
    });
  }

  async findDefaultPolicy(tenantId: string) {
    return this.prisma.bookingPolicy.findFirst({
      where: {
        tenantId,
        isDefault: true,
      },
    });
  }

  async update(id: string, data: Prisma.BookingPolicyUpdateInput) {
    return this.prisma.bookingPolicy.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.bookingPolicy.delete({
      where: { id },
    });
  }
}
