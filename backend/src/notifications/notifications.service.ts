import { Injectable } from '@nestjs/common';
import {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../lib/logger.service';
import { MetricsService } from '../lib/metrics.service';
import {
  INotificationAdapter,
  ConsoleNotificationAdapter,
  EmailNotificationAdapter,
  SMSNotificationAdapter,
} from '../lib/adapters/notification.adapter';

@Injectable()
export class NotificationsService {
  private adapters: INotificationAdapter[] = [];

  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private metrics: MetricsService,
  ) {
    this.logger.setContext('NotificationsService');

    // Register default adapters
    this.registerAdapter(new ConsoleNotificationAdapter());
    this.registerAdapter(new EmailNotificationAdapter());
    this.registerAdapter(new SMSNotificationAdapter());
  }

  registerAdapter(adapter: INotificationAdapter): void {
    this.adapters.push(adapter);
    this.logger.info('Registered notification adapter', {
      adapter: adapter.constructor.name,
    });
  }

  async create(data: {
    userId?: string;
    type: NotificationType;
    channel: NotificationChannel;
    recipientEmail?: string;
    recipientPhone?: string;
    subject?: string;
    body: string;
    metaJson?: any;
  }) {
    this.logger.info('Creating notification', {
      type: data.type,
      channel: data.channel,
    });

    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        channel: data.channel,
        recipientEmail: data.recipientEmail,
        recipientPhone: data.recipientPhone,
        subject: data.subject,
        body: data.body,
        metaJson: data.metaJson,
      },
    });

    this.metrics.incrementCounter('notifications.created', {
      type: data.type,
      channel: data.channel,
    });

    // Attempt to send immediately
    await this.send(notification.id);

    return notification;
  }

  async send(notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      this.logger.warn('Notification not found', { notificationId });
      return;
    }

    if (notification.status === NotificationStatus.SENT) {
      this.logger.debug('Notification already sent', { notificationId });
      return;
    }

    // Find appropriate adapter
    const adapter = this.adapters.find((a) => a.supports(notification.channel));

    if (!adapter) {
      this.logger.error('No adapter found for channel', {
        channel: notification.channel,
      });
      await this.markFailed(
        notificationId,
        `No adapter found for channel: ${notification.channel}`,
      );
      return;
    }

    try {
      this.logger.info('Sending notification', {
        notificationId,
        channel: notification.channel,
        adapter: adapter.constructor.name,
      });

      const result = await adapter.send({
        channel: notification.channel,
        recipientEmail: notification.recipientEmail,
        recipientPhone: notification.recipientPhone,
        subject: notification.subject,
        body: notification.body,
        metadata: notification.metaJson as any,
      });

      if (result.success) {
        await this.markSent(notificationId);
        this.metrics.incrementCounter('notifications.sent.success', {
          type: notification.type,
          channel: notification.channel,
        });
      } else {
        await this.markFailed(notificationId, result.error);
        this.metrics.incrementCounter('notifications.sent.failed', {
          type: notification.type,
          channel: notification.channel,
        });
      }
    } catch (error) {
      this.logger.error('Failed to send notification', error, { notificationId });
      await this.markFailed(notificationId, error.message);
      this.metrics.incrementCounter('notifications.sent.error', {
        type: notification.type,
        channel: notification.channel,
      });
    }
  }

  async markSent(notificationId: string) {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      },
    });

    this.logger.info('Notification marked as sent', { notificationId });
  }

  async markFailed(notificationId: string, reason: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.FAILED,
        failureReason: reason,
        retryCount: (notification?.retryCount || 0) + 1,
      },
    });

    this.logger.warn('Notification failed', { notificationId, reason });
  }

  async findAll(filters?: {
    userId?: string;
    type?: NotificationType;
    status?: NotificationStatus;
  }) {
    const where: any = {};

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });
  }

  async findOne(id: string) {
    return this.prisma.notification.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async retry(notificationId: string) {
    this.logger.info('Retrying notification', { notificationId });

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.PENDING,
        failureReason: null,
      },
    });

    await this.send(notificationId);
  }
}
