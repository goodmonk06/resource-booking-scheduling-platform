import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../lib/logger.service';
import { MetricsService } from '../lib/metrics.service';
import { EventBus } from '../lib/events/domain-events';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private metrics: MetricsService,
    private eventBus: EventBus,
  ) {
    this.logger.setContext('ReviewsService');
  }

  async create(data: {
    resourceId: string;
    userId: string;
    reservationId: string;
    rating: number;
    comment?: string;
  }) {
    this.logger.info('Creating review', { resourceId: data.resourceId, rating: data.rating });

    // Validate rating range
    if (data.rating < 1 || data.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Check if reservation exists and belongs to user
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: data.reservationId },
      include: { review: true },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.userId !== data.userId) {
      throw new BadRequestException('You can only review your own reservations');
    }

    if (reservation.review) {
      throw new BadRequestException('Reservation already has a review');
    }

    // Create review
    const review = await this.prisma.resourceReview.create({
      data: {
        resourceId: data.resourceId,
        userId: data.userId,
        reservationId: data.reservationId,
        rating: data.rating,
        comment: data.comment,
      },
      include: {
        resource: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    this.metrics.incrementCounter('reviews.created', { resourceId: data.resourceId });
    this.eventBus.publish({
      type: 'review.created',
      payload: { review, timestamp: new Date() },
    });

    this.logger.info('Review created successfully', { reviewId: review.id });

    return review;
  }

  async findAll(filters?: { resourceId?: string; userId?: string; minRating?: number }) {
    this.logger.debug('Finding reviews', filters);

    const where: any = {};

    if (filters?.resourceId) {
      where.resourceId = filters.resourceId;
    }

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.minRating) {
      where.rating = { gte: filters.minRating };
    }

    const reviews = await this.prisma.resourceReview.findMany({
      where,
      include: {
        resource: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reviews;
  }

  async findOne(id: string) {
    const review = await this.prisma.resourceReview.findUnique({
      where: { id },
      include: {
        resource: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reservation: true,
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  async getResourceRating(resourceId: string) {
    this.logger.debug('Getting resource rating', { resourceId });

    const result = await this.prisma.resourceReview.aggregate({
      where: { resourceId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      resourceId,
      averageRating: result._avg.rating || 0,
      totalReviews: result._count.rating,
    };
  }

  async update(id: string, userId: string, data: { rating?: number; comment?: string }) {
    const review = await this.prisma.resourceReview.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId) {
      throw new BadRequestException('You can only update your own reviews');
    }

    if (data.rating && (data.rating < 1 || data.rating > 5)) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const updated = await this.prisma.resourceReview.update({
      where: { id },
      data,
      include: {
        resource: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.info('Review updated', { reviewId: id });

    return updated;
  }

  async remove(id: string, userId: string) {
    const review = await this.prisma.resourceReview.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId) {
      throw new BadRequestException('You can only delete your own reviews');
    }

    await this.prisma.resourceReview.delete({
      where: { id },
    });

    this.logger.info('Review deleted', { reviewId: id });
  }
}
