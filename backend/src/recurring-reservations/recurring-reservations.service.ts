import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { RecurrencePattern, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../lib/logger.service';
import { MetricsService } from '../lib/metrics.service';
import { EventBus } from '../lib/events/domain-events';
import { CreateRecurringReservationDto } from './dto/create-recurring-reservation.dto';
import { UpdateRecurringReservationDto } from './dto/update-recurring-reservation.dto';

interface RecurringInstance {
  startTime: Date;
  endTime: Date;
}

@Injectable()
export class RecurringReservationsService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private metrics: MetricsService,
    private eventBus: EventBus,
  ) {
    this.logger.setContext('RecurringReservationsService');
  }

  /**
   * Create a recurring reservation series
   */
  async create(data: CreateRecurringReservationDto) {
    this.logger.info('Creating recurring reservation', {
      resourceId: data.resourceId,
      pattern: data.pattern,
    });

    // Validate inputs
    if (!data.endsAt && !data.occurrences) {
      throw new BadRequestException(
        'Either endsAt or occurrences must be specified',
      );
    }

    if (data.pattern === RecurrencePattern.WEEKLY && !data.daysOfWeek?.length) {
      throw new BadRequestException(
        'daysOfWeek is required for WEEKLY pattern',
      );
    }

    if (data.pattern === RecurrencePattern.MONTHLY && !data.dayOfMonth) {
      throw new BadRequestException(
        'dayOfMonth is required for MONTHLY pattern',
      );
    }

    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }

    // Generate all instances
    const instances = this.generateInstances({
      startTime,
      endTime,
      pattern: data.pattern,
      interval: data.interval || 1,
      daysOfWeek: data.daysOfWeek,
      dayOfMonth: data.dayOfMonth,
      endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
      occurrences: data.occurrences,
    });

    this.logger.debug('Generated recurring instances', {
      count: instances.length,
    });

    // Check availability for all instances
    await this.validateAllInstancesAvailable(data.resourceId, instances);

    // Create the first reservation (parent)
    const parentReservation = await this.prisma.reservation.create({
      data: {
        resourceId: data.resourceId,
        userId: data.userId,
        startTime: instances[0].startTime,
        endTime: instances[0].endTime,
        status: ReservationStatus.CONFIRMED,
        metaJson: {
          ...data.metaJson,
          isRecurring: true,
          instanceIndex: 0,
        },
      },
    });

    // Create the recurrence record
    const recurrence = await this.prisma.reservationRecurrence.create({
      data: {
        reservationId: parentReservation.id,
        pattern: data.pattern,
        interval: data.interval || 1,
        daysOfWeek: data.daysOfWeek || [],
        dayOfMonth: data.dayOfMonth,
        endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
        occurrences: data.occurrences,
        exceptions: [],
      },
    });

    // Create all subsequent instances
    for (let i = 1; i < instances.length; i++) {
      await this.prisma.reservation.create({
        data: {
          resourceId: data.resourceId,
          userId: data.userId,
          startTime: instances[i].startTime,
          endTime: instances[i].endTime,
          status: ReservationStatus.CONFIRMED,
          metaJson: {
            ...data.metaJson,
            isRecurring: true,
            parentReservationId: parentReservation.id,
            instanceIndex: i,
          },
        },
      });
    }

    this.metrics.incrementCounter('recurring_reservations.created', {
      pattern: data.pattern,
      instanceCount: instances.length.toString(),
    });

    this.eventBus.publish({
      type: 'reservation.created',
      payload: {
        reservation: parentReservation,
        isRecurring: true,
        instanceCount: instances.length,
        timestamp: new Date(),
      },
    });

    this.logger.info('Created recurring reservation series', {
      parentId: parentReservation.id,
      instances: instances.length,
    });

    return {
      parentReservation,
      recurrence,
      instanceCount: instances.length,
    };
  }

  /**
   * Generate instances based on recurrence pattern
   */
  private generateInstances(params: {
    startTime: Date;
    endTime: Date;
    pattern: RecurrencePattern;
    interval: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    endsAt?: Date;
    occurrences?: number;
  }): RecurringInstance[] {
    const instances: RecurringInstance[] = [];
    const duration = params.endTime.getTime() - params.startTime.getTime();

    let currentDate = new Date(params.startTime);
    const maxInstances = params.occurrences || 365; // Safety limit
    const endDate = params.endsAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    while (instances.length < maxInstances && currentDate <= endDate) {
      const instanceStart = new Date(currentDate);
      const instanceEnd = new Date(currentDate.getTime() + duration);

      instances.push({
        startTime: instanceStart,
        endTime: instanceEnd,
      });

      // Move to next occurrence
      currentDate = this.getNextOccurrence(
        currentDate,
        params.pattern,
        params.interval,
        params.daysOfWeek,
        params.dayOfMonth,
      );
    }

    return instances;
  }

  /**
   * Calculate the next occurrence based on pattern
   */
  private getNextOccurrence(
    current: Date,
    pattern: RecurrencePattern,
    interval: number,
    daysOfWeek?: number[],
    dayOfMonth?: number,
  ): Date {
    const next = new Date(current);

    switch (pattern) {
      case RecurrencePattern.DAILY:
        next.setDate(next.getDate() + interval);
        break;

      case RecurrencePattern.WEEKLY:
        // Move to next occurrence on specified days of week
        if (!daysOfWeek || daysOfWeek.length === 0) {
          next.setDate(next.getDate() + 7 * interval);
        } else {
          // Find next valid day
          let daysToAdd = 1;
          let foundNext = false;
          while (!foundNext && daysToAdd < 365) {
            const testDate = new Date(current);
            testDate.setDate(testDate.getDate() + daysToAdd);
            const dayOfWeek = testDate.getDay();

            if (daysOfWeek.includes(dayOfWeek)) {
              // Check if we've completed a full week cycle
              const weeksPassed = Math.floor(daysToAdd / 7);
              if (weeksPassed >= interval || daysToAdd < 7) {
                next.setDate(current.getDate() + daysToAdd);
                foundNext = true;
              }
            }
            daysToAdd++;
          }
        }
        break;

      case RecurrencePattern.MONTHLY:
        if (dayOfMonth) {
          next.setMonth(next.getMonth() + interval);
          next.setDate(Math.min(dayOfMonth, this.getDaysInMonth(next)));
        } else {
          next.setMonth(next.getMonth() + interval);
        }
        break;
    }

    return next;
  }

  /**
   * Get number of days in a given month
   */
  private getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  /**
   * Validate that all instances are available
   */
  private async validateAllInstancesAvailable(
    resourceId: string,
    instances: RecurringInstance[],
  ): Promise<void> {
    for (const instance of instances) {
      const conflicts = await this.prisma.reservation.findMany({
        where: {
          resourceId,
          status: {
            notIn: [ReservationStatus.CANCELLED, ReservationStatus.REJECTED],
          },
          OR: [
            {
              AND: [
                { startTime: { lte: instance.startTime } },
                { endTime: { gt: instance.startTime } },
              ],
            },
            {
              AND: [
                { startTime: { lt: instance.endTime } },
                { endTime: { gte: instance.endTime } },
              ],
            },
            {
              AND: [
                { startTime: { gte: instance.startTime } },
                { endTime: { lte: instance.endTime } },
              ],
            },
          ],
        },
      });

      if (conflicts.length > 0) {
        this.logger.warn('Conflict detected for recurring instance', {
          instanceStart: instance.startTime,
          conflicts: conflicts.length,
        });

        throw new ConflictException(
          `Conflict detected for instance at ${instance.startTime.toISOString()}`,
        );
      }
    }
  }

  /**
   * Find a recurring reservation by parent ID
   */
  async findOne(parentReservationId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: parentReservationId },
      include: {
        recurrence: true,
        resource: true,
        user: true,
      },
    });

    if (!reservation || !reservation.recurrence) {
      throw new NotFoundException('Recurring reservation not found');
    }

    // Find all instances
    const instances = await this.prisma.reservation.findMany({
      where: {
        OR: [
          { id: parentReservationId },
          {
            metaJson: {
              path: ['parentReservationId'],
              equals: parentReservationId,
            },
          },
        ],
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    return {
      parent: reservation,
      recurrence: reservation.recurrence,
      instances,
      totalInstances: instances.length,
    };
  }

  /**
   * Update a recurring reservation (future instances only)
   */
  async update(
    parentReservationId: string,
    data: UpdateRecurringReservationDto,
  ) {
    this.logger.info('Updating recurring reservation', {
      parentReservationId,
    });

    const existing = await this.prisma.reservation.findUnique({
      where: { id: parentReservationId },
      include: { recurrence: true },
    });

    if (!existing || !existing.recurrence) {
      throw new NotFoundException('Recurring reservation not found');
    }

    const updateData: any = {};

    if (data.pattern) updateData.pattern = data.pattern;
    if (data.interval) updateData.interval = data.interval;
    if (data.daysOfWeek) updateData.daysOfWeek = data.daysOfWeek;
    if (data.dayOfMonth) updateData.dayOfMonth = data.dayOfMonth;
    if (data.endsAt) updateData.endsAt = new Date(data.endsAt);
    if (data.occurrences) updateData.occurrences = data.occurrences;

    if (data.addExceptions) {
      const currentExceptions = existing.recurrence.exceptions || [];
      const newExceptions = data.addExceptions.map((d) => new Date(d));
      updateData.exceptions = [...currentExceptions, ...newExceptions];
    }

    const updated = await this.prisma.reservationRecurrence.update({
      where: { id: existing.recurrence.id },
      data: updateData,
    });

    this.metrics.incrementCounter('recurring_reservations.updated');

    this.logger.info('Updated recurring reservation', {
      recurrenceId: updated.id,
    });

    return updated;
  }

  /**
   * Cancel a single instance from the series
   */
  async cancelInstance(parentReservationId: string, instanceDate: string) {
    this.logger.info('Cancelling recurring instance', {
      parentReservationId,
      instanceDate,
    });

    const targetDate = new Date(instanceDate);

    // Find the specific instance
    const instances = await this.prisma.reservation.findMany({
      where: {
        OR: [
          { id: parentReservationId },
          {
            metaJson: {
              path: ['parentReservationId'],
              equals: parentReservationId,
            },
          },
        ],
        startTime: {
          gte: new Date(targetDate.setHours(0, 0, 0, 0)),
          lt: new Date(targetDate.setHours(23, 59, 59, 999)),
        },
      },
    });

    if (instances.length === 0) {
      throw new NotFoundException('Instance not found');
    }

    const instance = instances[0];

    // Cancel the instance
    const cancelled = await this.prisma.reservation.update({
      where: { id: instance.id },
      data: {
        status: ReservationStatus.CANCELLED,
      },
    });

    this.metrics.incrementCounter('recurring_reservations.instance_cancelled');

    this.eventBus.publish({
      type: 'reservation.cancelled',
      payload: {
        reservation: cancelled,
        reason: 'Cancelled from recurring series',
        timestamp: new Date(),
      },
    });

    this.logger.info('Cancelled recurring instance', {
      instanceId: instance.id,
    });

    return cancelled;
  }

  /**
   * Cancel entire recurring series (all future instances)
   */
  async cancelSeries(parentReservationId: string) {
    this.logger.info('Cancelling recurring series', {
      parentReservationId,
    });

    // Find all instances
    const instances = await this.prisma.reservation.findMany({
      where: {
        OR: [
          { id: parentReservationId },
          {
            metaJson: {
              path: ['parentReservationId'],
              equals: parentReservationId,
            },
          },
        ],
        startTime: {
          gte: new Date(),
        },
        status: {
          notIn: [ReservationStatus.CANCELLED],
        },
      },
    });

    // Cancel all future instances
    await this.prisma.reservation.updateMany({
      where: {
        id: {
          in: instances.map((i) => i.id),
        },
      },
      data: {
        status: ReservationStatus.CANCELLED,
      },
    });

    this.metrics.incrementCounter('recurring_reservations.series_cancelled', {
      instanceCount: instances.length.toString(),
    });

    this.logger.info('Cancelled recurring series', {
      parentReservationId,
      cancelledCount: instances.length,
    });

    return {
      cancelledCount: instances.length,
    };
  }

  /**
   * List all recurring reservations for a user
   */
  async findByUser(userId: string) {
    const reservations = await this.prisma.reservation.findMany({
      where: {
        userId,
        recurrence: {
          isNot: null,
        },
      },
      include: {
        recurrence: true,
        resource: true,
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    return reservations;
  }

  /**
   * List all recurring reservations for a resource
   */
  async findByResource(resourceId: string) {
    const reservations = await this.prisma.reservation.findMany({
      where: {
        resourceId,
        recurrence: {
          isNot: null,
        },
      },
      include: {
        recurrence: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    return reservations;
  }
}
