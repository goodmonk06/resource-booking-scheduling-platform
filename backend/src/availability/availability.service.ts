import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  addDays,
  addMinutes,
  format,
  parse,
  isWithinInterval,
  areIntervalsOverlapping,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { OpeningHoursService } from '../opening-hours/opening-hours.service';
import { ReservationsService } from '../reservations/reservations.service';

interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

interface AvailabilitySlot {
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
}

@Injectable()
export class AvailabilityService {
  constructor(
    private prisma: PrismaService,
    private openingHoursService: OpeningHoursService,
    private reservationsService: ReservationsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getAvailableSlots(
    resourceId: string,
    startDate: Date,
    endDate: Date,
    durationMinutes: number,
    slotIntervalMinutes: number = 30,
  ): Promise<AvailabilitySlot[]> {
    // Try to get from cache
    const cacheKey = `availability:${resourceId}:${format(startDate, 'yyyy-MM-dd')}:${format(endDate, 'yyyy-MM-dd')}:${durationMinutes}`;
    const cached = await this.cacheManager.get<AvailabilitySlot[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get opening hours for the resource
    const openingHours = await this.openingHoursService.getResourceOpeningHours(
      resourceId,
    );

    if (!openingHours || openingHours.length === 0) {
      return [];
    }

    // Get existing reservations in the date range
    const reservations = await this.reservationsService.findAll({
      resourceId,
      startDate: startOfDay(startDate),
      endDate: endOfDay(endDate),
      status: undefined, // Get all non-cancelled
    });

    const confirmedReservations = reservations.filter(
      (r) => r.status === 'CONFIRMED' || r.status === 'PENDING',
    );

    const availableSlots: AvailabilitySlot[] = [];
    let currentDate = startOfDay(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday

      // Find opening hours for this day
      const dayOpeningHours = openingHours.filter(
        (oh) => oh.weekday === dayOfWeek,
      );

      for (const oh of dayOpeningHours) {
        // Parse opening hours
        const [startHour, startMinute] = oh.startTime.split(':').map(Number);
        const [endHour, endMinute] = oh.endTime.split(':').map(Number);

        const dayStart = new Date(currentDate);
        dayStart.setHours(startHour, startMinute, 0, 0);

        const dayEnd = new Date(currentDate);
        dayEnd.setHours(endHour, endMinute, 0, 0);

        // Generate slots for this opening hours period
        let slotStart = dayStart;

        while (slotStart < dayEnd) {
          const slotEnd = addMinutes(slotStart, durationMinutes);

          // Check if slot end is within opening hours
          if (slotEnd <= dayEnd) {
            // Check if slot conflicts with any reservation
            const hasConflict = confirmedReservations.some((reservation) => {
              return areIntervalsOverlapping(
                { start: slotStart, end: slotEnd },
                { start: new Date(reservation.startsAt), end: new Date(reservation.endsAt) },
                { inclusive: false },
              );
            });

            if (!hasConflict) {
              availableSlots.push({
                startsAt: slotStart.toISOString(),
                endsAt: slotEnd.toISOString(),
                durationMinutes,
              });
            }
          }

          // Move to next slot
          slotStart = addMinutes(slotStart, slotIntervalMinutes);
        }
      }

      currentDate = addDays(currentDate, 1);
    }

    // Cache the result for 5 minutes
    await this.cacheManager.set(cacheKey, availableSlots, 300000);

    return availableSlots;
  }

  async checkAvailability(
    resourceId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<boolean> {
    // Check if time is within opening hours
    const openingHours = await this.openingHoursService.getResourceOpeningHours(
      resourceId,
    );

    const dayOfWeek = startsAt.getDay();
    const dayOpeningHours = openingHours.filter(
      (oh) => oh.weekday === dayOfWeek,
    );

    if (dayOpeningHours.length === 0) {
      return false; // Not open on this day
    }

    const timeStr = format(startsAt, 'HH:mm');
    const endTimeStr = format(endsAt, 'HH:mm');

    const isWithinOpeningHours = dayOpeningHours.some((oh) => {
      return timeStr >= oh.startTime && endTimeStr <= oh.endTime;
    });

    if (!isWithinOpeningHours) {
      return false;
    }

    // Check for conflicts
    const conflicts = await this.reservationsService.checkConflicts(
      resourceId,
      startsAt,
      endsAt,
    );

    return conflicts.length === 0;
  }

  async invalidateCache(resourceId: string) {
    // In a production system, you'd want to delete all keys matching the pattern
    // For now, we'll rely on TTL
    // await this.cacheManager.del(`availability:${resourceId}:*`);
  }
}
