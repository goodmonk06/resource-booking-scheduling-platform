import { Reservation, ResourceReview, Notification } from '@prisma/client';

export type DomainEvent =
  | ReservationCreatedEvent
  | ReservationConfirmedEvent
  | ReservationCancelledEvent
  | ReservationCompletedEvent
  | ReviewCreatedEvent
  | NotificationSentEvent
  | PaymentProcessedEvent;

export interface ReservationCreatedEvent {
  type: 'reservation.created';
  payload: {
    reservation: Reservation;
    timestamp: Date;
  };
}

export interface ReservationConfirmedEvent {
  type: 'reservation.confirmed';
  payload: {
    reservation: Reservation;
    paymentId?: string;
    timestamp: Date;
  };
}

export interface ReservationCancelledEvent {
  type: 'reservation.cancelled';
  payload: {
    reservation: Reservation;
    reason?: string;
    timestamp: Date;
  };
}

export interface ReservationCompletedEvent {
  type: 'reservation.completed';
  payload: {
    reservation: Reservation;
    timestamp: Date;
  };
}

export interface ReviewCreatedEvent {
  type: 'review.created';
  payload: {
    review: ResourceReview;
    timestamp: Date;
  };
}

export interface NotificationSentEvent {
  type: 'notification.sent';
  payload: {
    notification: Notification;
    timestamp: Date;
  };
}

export interface PaymentProcessedEvent {
  type: 'payment.processed';
  payload: {
    reservationId: string;
    paymentId: string;
    amount: number;
    currency: string;
    timestamp: Date;
  };
}

export type EventHandler = (event: DomainEvent) => Promise<void> | void;

export class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  /**
   * Register an event handler for a specific event type
   */
  on(eventType: DomainEvent['type'], handler: EventHandler): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
  }

  /**
   * Publish an event to all registered handlers
   */
  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];

    // Execute all handlers in parallel
    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${event.type}:`, error);
          // In production, this would be logged to error tracking service
        }
      }),
    );
  }

  /**
   * Remove all handlers for testing
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * Get count of handlers for a specific event type
   */
  getHandlerCount(eventType: DomainEvent['type']): number {
    return (this.handlers.get(eventType) || []).length;
  }
}
