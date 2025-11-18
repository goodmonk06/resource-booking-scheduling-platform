import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ReservationStatus } from '@prisma/client';

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    resourceId: string;
    userId?: string;
    startsAt: Date;
    endsAt: Date;
    metaJson?: any;
  }) {
    // Check for conflicts
    const conflicts = await this.checkConflicts(
      data.resourceId,
      data.startsAt,
      data.endsAt,
    );

    if (conflicts.length > 0) {
      throw new BadRequestException(
        'This time slot conflicts with an existing reservation',
      );
    }

    return this.prisma.reservation.create({
      data: {
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        metaJson: data.metaJson,
        resource: {
          connect: { id: data.resourceId },
        },
        ...(data.userId && {
          user: {
            connect: { id: data.userId },
          },
        }),
      },
      include: {
        resource: true,
        user: true,
      },
    });
  }

  async findAll(filters?: {
    resourceId?: string;
    userId?: string;
    status?: ReservationStatus;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (filters?.resourceId) {
      where.resourceId = filters.resourceId;
    }
    if (filters?.userId) {
      where.userId = filters.userId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.startDate || filters?.endDate) {
      where.AND = [];
      if (filters.startDate) {
        where.AND.push({ startsAt: { gte: filters.startDate } });
      }
      if (filters.endDate) {
        where.AND.push({ endsAt: { lte: filters.endDate } });
      }
    }

    return this.prisma.reservation.findMany({
      where,
      include: {
        resource: {
          include: {
            group: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        startsAt: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        resource: {
          include: {
            group: {
              include: {
                tenant: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    return reservation;
  }

  async confirm(id: string, stripePaymentId?: string) {
    return this.prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CONFIRMED,
        ...(stripePaymentId && { stripePaymentId }),
      },
      include: {
        resource: true,
        user: true,
      },
    });
  }

  async cancel(id: string, cancellationNote?: string) {
    return this.prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CANCELLED,
        ...(cancellationNote && { cancellationNote }),
      },
      include: {
        resource: true,
        user: true,
      },
    });
  }

  async update(id: string, data: Prisma.ReservationUpdateInput) {
    return this.prisma.reservation.update({
      where: { id },
      data,
      include: {
        resource: true,
        user: true,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.reservation.delete({
      where: { id },
    });
  }

  async checkConflicts(
    resourceId: string,
    startsAt: Date,
    endsAt: Date,
    excludeReservationId?: string,
  ) {
    return this.prisma.reservation.findMany({
      where: {
        resourceId,
        status: {
          in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
        },
        ...(excludeReservationId && {
          id: { not: excludeReservationId },
        }),
        OR: [
          {
            // New reservation starts during existing reservation
            AND: [
              { startsAt: { lte: startsAt } },
              { endsAt: { gt: startsAt } },
            ],
          },
          {
            // New reservation ends during existing reservation
            AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gte: endsAt } }],
          },
          {
            // New reservation completely contains existing reservation
            AND: [{ startsAt: { gte: startsAt } }, { endsAt: { lte: endsAt } }],
          },
        ],
      },
    });
  }
}
