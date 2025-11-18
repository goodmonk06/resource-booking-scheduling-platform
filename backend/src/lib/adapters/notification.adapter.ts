import { NotificationChannel } from '@prisma/client';

export interface SendNotificationParams {
  channel: NotificationChannel;
  recipientEmail?: string;
  recipientPhone?: string;
  subject?: string;
  body: string;
  metadata?: Record<string, any>;
}

export interface SendNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Adapter interface for sending notifications through various channels
 * Implementations: EmailAdapter, SMSAdapter, PushAdapter, InAppAdapter
 */
export interface INotificationAdapter {
  /**
   * Check if this adapter can handle the given channel
   */
  supports(channel: NotificationChannel): boolean;

  /**
   * Send a notification
   */
  send(params: SendNotificationParams): Promise<SendNotificationResult>;
}

/**
 * Console-based notification adapter (for development/testing)
 */
export class ConsoleNotificationAdapter implements INotificationAdapter {
  supports(channel: NotificationChannel): boolean {
    return true; // Supports all channels for testing
  }

  async send(params: SendNotificationParams): Promise<SendNotificationResult> {
    console.log('📧 [NOTIFICATION]', {
      channel: params.channel,
      to: params.recipientEmail || params.recipientPhone,
      subject: params.subject,
      body: params.body.substring(0, 100) + '...',
      metadata: params.metadata,
    });

    return {
      success: true,
      messageId: `console-${Date.now()}`,
    };
  }
}

/**
 * Email notification adapter (stub implementation)
 * In production, this would integrate with SendGrid, AWS SES, Mailgun, etc.
 */
export class EmailNotificationAdapter implements INotificationAdapter {
  supports(channel: NotificationChannel): boolean {
    return channel === NotificationChannel.EMAIL;
  }

  async send(params: SendNotificationParams): Promise<SendNotificationResult> {
    if (!params.recipientEmail) {
      return {
        success: false,
        error: 'Email address is required',
      };
    }

    // TODO: Integrate with actual email service
    // Example: await sendgrid.send({ to: params.recipientEmail, ... })

    console.log(`Sending email to ${params.recipientEmail}: ${params.subject}`);

    return {
      success: true,
      messageId: `email-${Date.now()}`,
    };
  }
}

/**
 * SMS notification adapter (stub implementation)
 * In production, this would integrate with Twilio, AWS SNS, etc.
 */
export class SMSNotificationAdapter implements INotificationAdapter {
  supports(channel: NotificationChannel): boolean {
    return channel === NotificationChannel.SMS;
  }

  async send(params: SendNotificationParams): Promise<SendNotificationResult> {
    if (!params.recipientPhone) {
      return {
        success: false,
        error: 'Phone number is required',
      };
    }

    // TODO: Integrate with actual SMS service
    // Example: await twilio.messages.create({ to: params.recipientPhone, ... })

    console.log(`Sending SMS to ${params.recipientPhone}: ${params.body}`);

    return {
      success: true,
      messageId: `sms-${Date.now()}`,
    };
  }
}
