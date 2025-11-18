import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBus, DomainEvent } from '../lib/events/domain-events';
import { NotificationsService } from './notifications.service';
import { NotificationType, NotificationChannel } from '@prisma/client';
import { LoggerService } from '../lib/logger.service';

/**
 * Listens to domain events and creates notifications
 */
@Injectable()
export class NotificationProcessor implements OnModuleInit {
  constructor(
    private eventBus: EventBus,
    private notificationsService: NotificationsService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('NotificationProcessor');
  }

  onModuleInit() {
    // Register event handlers
    this.eventBus.on('reservation.created', this.onReservationCreated.bind(this));
    this.eventBus.on('reservation.confirmed', this.onReservationConfirmed.bind(this));
    this.eventBus.on('reservation.cancelled', this.onReservationCancelled.bind(this));
    this.eventBus.on('review.created', this.onReviewCreated.bind(this));

    this.logger.info('Notification processor initialized');
  }

  private async onReservationCreated(event: DomainEvent) {
    if (event.type !== 'reservation.created') return;

    const { reservation } = event.payload;

    // Send confirmation email (or use in-app notification for anonymous bookings)
    const channel =
      reservation.metaJson?.customerEmail
        ? NotificationChannel.EMAIL
        : NotificationChannel.IN_APP;

    await this.notificationsService.create({
      userId: reservation.userId,
      type: NotificationType.RESERVATION_CONFIRMED,
      channel,
      recipientEmail: reservation.metaJson?.customerEmail,
      subject: 'Reservation Received',
      body: `Your reservation has been created. Reservation ID: ${reservation.id}`,
      metaJson: {
        reservationId: reservation.id,
        resourceId: reservation.resourceId,
      },
    });

    this.logger.info('Sent reservation created notification', {
      reservationId: reservation.id,
    });
  }

  private async onReservationConfirmed(event: DomainEvent) {
    if (event.type !== 'reservation.confirmed') return;

    const { reservation } = event.payload;

    await this.notificationsService.create({
      userId: reservation.userId,
      type: NotificationType.RESERVATION_CONFIRMED,
      channel: NotificationChannel.EMAIL,
      recipientEmail: reservation.metaJson?.customerEmail,
      subject: 'Reservation Confirmed',
      body: `Your reservation has been confirmed. Reservation ID: ${reservation.id}`,
      metaJson: {
        reservationId: reservation.id,
        resourceId: reservation.resourceId,
      },
    });

    this.logger.info('Sent reservation confirmed notification', {
      reservationId: reservation.id,
    });
  }

  private async onReservationCancelled(event: DomainEvent) {
    if (event.type !== 'reservation.cancelled') return;

    const { reservation, reason } = event.payload;

    await this.notificationsService.create({
      userId: reservation.userId,
      type: NotificationType.RESERVATION_CANCELLED,
      channel: NotificationChannel.EMAIL,
      recipientEmail: reservation.metaJson?.customerEmail,
      subject: 'Reservation Cancelled',
      body: `Your reservation has been cancelled. ${reason ? `Reason: ${reason}` : ''}`,
      metaJson: {
        reservationId: reservation.id,
        resourceId: reservation.resourceId,
        reason,
      },
    });

    this.logger.info('Sent reservation cancelled notification', {
      reservationId: reservation.id,
    });
  }

  private async onReviewCreated(event: DomainEvent) {
    if (event.type !== 'review.created') return;

    const { review } = event.payload;

    // Notify resource owner/admin about new review
    await this.notificationsService.create({
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      channel: NotificationChannel.IN_APP,
      subject: 'New Review Received',
      body: `A new review has been posted for resource ${review.resourceId}: ${review.rating} stars`,
      metaJson: {
        reviewId: review.id,
        resourceId: review.resourceId,
        rating: review.rating,
      },
    });

    this.logger.info('Sent review created notification', {
      reviewId: review.id,
    });
  }
}
