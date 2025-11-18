# Integration Guide

This guide covers how to integrate the Resource Booking & Scheduling Platform with external systems and services.

## Table of Contents

- [Authentication Integration](#authentication-integration)
- [Notification Adapters](#notification-adapters)
- [Payment Integration](#payment-integration)
- [Calendar Sync](#calendar-sync)
- [Webhooks (Future)](#webhooks-future)
- [API Client Examples](#api-client-examples)
- [Error Handling](#error-handling)

## Authentication Integration

### JWT Authentication

The platform uses JWT tokens for authentication. To integrate:

#### 1. Obtain a Token

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### 2. Use Token in Requests

```http
GET /reservations
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 3. Refresh Tokens (Future)

Currently, tokens have a fixed expiration. Refresh token mechanism is planned.

### External OAuth Providers (Future)

Integration with Google, Microsoft, and other OAuth providers is planned:

```typescript
// Future implementation
@Get('auth/google')
async googleAuth() {
  // Redirect to Google OAuth
}

@Get('auth/google/callback')
async googleCallback(@Query('code') code: string) {
  // Exchange code for token
  // Create/update user
  // Return JWT
}
```

## Notification Adapters

The platform supports multiple notification channels via the adapter pattern.

### Email Adapter

#### Using SendGrid

```typescript
import { INotificationAdapter, SendNotificationParams, SendNotificationResult } from '../lib/adapters/notification.adapter';
import sgMail from '@sendgrid/mail';

export class SendGridNotificationAdapter implements INotificationAdapter {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  supports(channel: NotificationChannel): boolean {
    return channel === NotificationChannel.EMAIL;
  }

  async send(params: SendNotificationParams): Promise<SendNotificationResult> {
    try {
      const msg = {
        to: params.recipientEmail,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: params.subject,
        text: params.body,
        html: `<p>${params.body}</p>`,
      };

      await sgMail.send(msg);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
```

#### Register the Adapter

```typescript
// In notifications.service.ts constructor
this.registerAdapter(new SendGridNotificationAdapter());
```

#### Using AWS SES

```typescript
import { SES } from '@aws-sdk/client-ses';

export class SESNotificationAdapter implements INotificationAdapter {
  private ses: SES;

  constructor() {
    this.ses = new SES({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  supports(channel: NotificationChannel): boolean {
    return channel === NotificationChannel.EMAIL;
  }

  async send(params: SendNotificationParams): Promise<SendNotificationResult> {
    try {
      await this.ses.sendEmail({
        Source: process.env.SES_FROM_EMAIL,
        Destination: {
          ToAddresses: [params.recipientEmail],
        },
        Message: {
          Subject: { Data: params.subject },
          Body: {
            Text: { Data: params.body },
            Html: { Data: `<p>${params.body}</p>` },
          },
        },
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
```

### SMS Adapter

#### Using Twilio

```typescript
import { Twilio } from 'twilio';

export class TwilioNotificationAdapter implements INotificationAdapter {
  private client: Twilio;

  constructor() {
    this.client = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }

  supports(channel: NotificationChannel): boolean {
    return channel === NotificationChannel.SMS;
  }

  async send(params: SendNotificationParams): Promise<SendNotificationResult> {
    try {
      await this.client.messages.create({
        body: params.body,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: params.recipientPhone,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
```

### Push Notification Adapter

#### Using Firebase Cloud Messaging (FCM)

```typescript
import * as admin from 'firebase-admin';

export class FCMNotificationAdapter implements INotificationAdapter {
  constructor() {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FCM_PROJECT_ID,
        clientEmail: process.env.FCM_CLIENT_EMAIL,
        privateKey: process.env.FCM_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  }

  supports(channel: NotificationChannel): boolean {
    return channel === NotificationChannel.PUSH;
  }

  async send(params: SendNotificationParams): Promise<SendNotificationResult> {
    try {
      const deviceToken = params.metadata?.deviceToken;
      if (!deviceToken) {
        return {
          success: false,
          error: 'Device token not provided',
        };
      }

      await admin.messaging().send({
        token: deviceToken,
        notification: {
          title: params.subject,
          body: params.body,
        },
        data: params.metadata || {},
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
```

## Payment Integration

### Stripe Integration

#### Setup

```bash
npm install stripe
```

#### Create Stripe Adapter

```typescript
import Stripe from 'stripe';
import { IPaymentAdapter, CreatePaymentIntentParams, PaymentIntent } from '../lib/adapters/payment.adapter';

export class StripePaymentAdapter implements IPaymentAdapter {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntent> {
    const intent = await this.stripe.paymentIntents.create({
      amount: Math.round(params.amount * 100), // Convert to cents
      currency: params.currency || 'usd',
      metadata: {
        reservationId: params.reservationId,
        userId: params.userId,
      },
    });

    return {
      id: intent.id,
      clientSecret: intent.client_secret,
      amount: params.amount,
      currency: params.currency || 'usd',
      status: intent.status,
    };
  }

  async confirmPayment(intentId: string): Promise<PaymentResult> {
    const intent = await this.stripe.paymentIntents.retrieve(intentId);

    return {
      success: intent.status === 'succeeded',
      paymentId: intent.id,
      status: intent.status,
    };
  }

  async refund(paymentId: string, amount?: number): Promise<RefundResult> {
    const refund = await this.stripe.refunds.create({
      payment_intent: paymentId,
      amount: amount ? Math.round(amount * 100) : undefined,
    });

    return {
      success: refund.status === 'succeeded',
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status,
    };
  }
}
```

#### Register Adapter

```typescript
// In payments.service.ts
this.adapter = new StripePaymentAdapter();
```

#### Client-Side Integration

```typescript
// Frontend: Create payment intent
const response = await fetch('/api/payments/intent', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    reservationId: 'reservation-uuid',
    amount: 100.00,
    currency: 'usd',
  }),
});

const { clientSecret } = await response.json();

// Use Stripe.js to confirm payment
const stripe = Stripe(publicKey);
const result = await stripe.confirmCardPayment(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: {
      name: 'Customer Name',
    },
  },
});

if (result.error) {
  // Handle error
} else {
  // Payment successful
  await fetch(`/api/payments/${result.paymentIntent.id}/confirm`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}
```

### PayPal Integration

```typescript
import checkoutNodeJssdk from '@paypal/checkout-server-sdk';

export class PayPalPaymentAdapter implements IPaymentAdapter {
  private client: any;

  constructor() {
    const environment = new checkoutNodeJssdk.core.SandboxEnvironment(
      process.env.PAYPAL_CLIENT_ID,
      process.env.PAYPAL_CLIENT_SECRET,
    );
    this.client = new checkoutNodeJssdk.core.PayPalHttpClient(environment);
  }

  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntent> {
    const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: params.currency?.toUpperCase() || 'USD',
          value: params.amount.toFixed(2),
        },
        custom_id: params.reservationId,
      }],
    });

    const order = await this.client.execute(request);

    return {
      id: order.result.id,
      clientSecret: order.result.id, // PayPal uses order ID
      amount: params.amount,
      currency: params.currency || 'usd',
      status: order.result.status,
    };
  }

  // Additional methods...
}
```

## Calendar Sync

### Google Calendar Integration

#### Setup

```bash
npm install googleapis
```

#### Create Google Calendar Adapter

```typescript
import { google } from 'googleapis';
import { ICalendarAdapter, SyncResult, CalendarEvent } from '../lib/adapters/calendar.adapter';

export class GoogleCalendarAdapter implements ICalendarAdapter {
  private calendar: any;

  constructor() {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    auth.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    this.calendar = google.calendar({ version: 'v3', auth });
  }

  async createEvent(reservation: Reservation): Promise<CalendarEvent> {
    const event = {
      summary: `Reservation: ${reservation.resource.name}`,
      description: `Booking for ${reservation.user.name}`,
      start: {
        dateTime: reservation.startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: reservation.endTime.toISOString(),
        timeZone: 'UTC',
      },
      attendees: [
        { email: reservation.user.email },
      ],
    };

    const response = await this.calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    return {
      id: response.data.id,
      url: response.data.htmlLink,
      provider: 'google',
    };
  }

  async updateEvent(eventId: string, updates: Partial<Reservation>): Promise<CalendarEvent> {
    const event: any = {};

    if (updates.startTime) {
      event.start = {
        dateTime: updates.startTime.toISOString(),
        timeZone: 'UTC',
      };
    }

    if (updates.endTime) {
      event.end = {
        dateTime: updates.endTime.toISOString(),
        timeZone: 'UTC',
      };
    }

    const response = await this.calendar.events.patch({
      calendarId: 'primary',
      eventId,
      resource: event,
    });

    return {
      id: response.data.id,
      url: response.data.htmlLink,
      provider: 'google',
    };
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });
  }

  async sync(reservations: Reservation[]): Promise<SyncResult> {
    const results = await Promise.allSettled(
      reservations.map(res => this.createEvent(res)),
    );

    const synced = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
      synced,
      failed,
      total: reservations.length,
    };
  }
}
```

### Microsoft Outlook Integration

```typescript
import { Client } from '@microsoft/microsoft-graph-client';

export class OutlookCalendarAdapter implements ICalendarAdapter {
  private client: Client;

  constructor() {
    this.client = Client.init({
      authProvider: async (done) => {
        // Get access token using MSAL or similar
        const token = await this.getAccessToken();
        done(null, token);
      },
    });
  }

  async createEvent(reservation: Reservation): Promise<CalendarEvent> {
    const event = {
      subject: `Reservation: ${reservation.resource.name}`,
      body: {
        contentType: 'HTML',
        content: `Booking for ${reservation.user.name}`,
      },
      start: {
        dateTime: reservation.startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: reservation.endTime.toISOString(),
        timeZone: 'UTC',
      },
      attendees: [
        {
          emailAddress: {
            address: reservation.user.email,
            name: reservation.user.name,
          },
          type: 'required',
        },
      ],
    };

    const response = await this.client
      .api('/me/calendar/events')
      .post(event);

    return {
      id: response.id,
      url: response.webLink,
      provider: 'outlook',
    };
  }

  // Additional methods...
}
```

## Webhooks (Future)

### Webhook Configuration

```typescript
// Future implementation
export class WebhookService {
  async registerWebhook(params: {
    url: string;
    events: string[];
    secret: string;
  }) {
    // Store webhook configuration
    // Validate webhook URL
    // Generate signing key
  }

  async triggerWebhook(event: DomainEvent) {
    // Find subscribed webhooks
    // Sign payload
    // Send HTTP POST
    // Retry on failure
  }
}
```

### Webhook Payload Example

```json
{
  "id": "webhook-event-uuid",
  "type": "reservation.created",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "reservation": {
      "id": "reservation-uuid",
      "resourceId": "resource-uuid",
      "userId": "user-uuid",
      "startTime": "2024-01-20T10:00:00.000Z",
      "endTime": "2024-01-20T11:00:00.000Z",
      "status": "CONFIRMED"
    }
  },
  "signature": "sha256=..."
}
```

## API Client Examples

### JavaScript/TypeScript Client

```typescript
class BookingAPIClient {
  private baseURL: string;
  private token: string;

  constructor(baseURL: string, token: string) {
    this.baseURL = baseURL;
    this.token = token;
  }

  private async request(method: string, path: string, body?: any) {
    const response = await fetch(`${this.baseURL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  }

  // Resources
  async getResources(filters?: { groupId?: string }) {
    const params = new URLSearchParams(filters);
    return this.request('GET', `/resources?${params}`);
  }

  async getResource(id: string) {
    return this.request('GET', `/resources/${id}`);
  }

  // Reservations
  async createReservation(data: {
    resourceId: string;
    startTime: string;
    endTime: string;
    metaJson?: any;
  }) {
    return this.request('POST', '/reservations', data);
  }

  async getReservations(filters?: {
    resourceId?: string;
    userId?: string;
    status?: string;
  }) {
    const params = new URLSearchParams(filters);
    return this.request('GET', `/reservations?${params}`);
  }

  async cancelReservation(id: string, reason?: string) {
    return this.request('PATCH', `/reservations/${id}/cancel`, { reason });
  }

  // Availability
  async checkAvailability(resourceId: string, params: {
    startDate: string;
    endDate: string;
    duration: number;
  }) {
    const query = new URLSearchParams(params as any);
    return this.request('GET', `/availability/${resourceId}?${query}`);
  }

  // Analytics
  async getResourceUtilization(resourceId: string, dateRange?: {
    startDate?: string;
    endDate?: string;
  }) {
    const params = new URLSearchParams(dateRange);
    return this.request('GET', `/analytics/resources/${resourceId}/utilization?${params}`);
  }
}

// Usage
const client = new BookingAPIClient('http://localhost:3001', 'your-jwt-token');

const resources = await client.getResources({ groupId: 'group-uuid' });
const reservation = await client.createReservation({
  resourceId: 'resource-uuid',
  startTime: '2024-01-20T10:00:00Z',
  endTime: '2024-01-20T11:00:00Z',
});
```

### Python Client

```python
import requests
from typing import Optional, Dict, Any

class BookingAPIClient:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.token = token
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}'
        }

    def _request(self, method: str, path: str, data: Optional[Dict] = None) -> Any:
        response = requests.request(
            method,
            f'{self.base_url}{path}',
            headers=self.headers,
            json=data
        )
        response.raise_for_status()
        return response.json()

    def get_resources(self, group_id: Optional[str] = None):
        params = {'groupId': group_id} if group_id else {}
        return self._request('GET', '/resources', params=params)

    def create_reservation(self, resource_id: str, start_time: str, end_time: str, meta: Optional[Dict] = None):
        data = {
            'resourceId': resource_id,
            'startTime': start_time,
            'endTime': end_time,
            'metaJson': meta or {}
        }
        return self._request('POST', '/reservations', data)

# Usage
client = BookingAPIClient('http://localhost:3001', 'your-jwt-token')
resources = client.get_resources(group_id='group-uuid')
reservation = client.create_reservation(
    resource_id='resource-uuid',
    start_time='2024-01-20T10:00:00Z',
    end_time='2024-01-20T11:00:00Z'
)
```

## Error Handling

### Standard Error Response

```json
{
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/reservations",
  "method": "POST",
  "message": "Validation failed",
  "errors": [
    {
      "field": "startTime",
      "message": "startTime must be a valid ISO 8601 date string"
    }
  ]
}
```

### Client Error Handling

```typescript
try {
  const reservation = await client.createReservation({
    resourceId: 'resource-uuid',
    startTime: 'invalid-date',
    endTime: '2024-01-20T11:00:00Z',
  });
} catch (error) {
  if (error.statusCode === 400) {
    // Validation error
    console.error('Validation failed:', error.errors);
  } else if (error.statusCode === 409) {
    // Conflict error
    console.error('Time slot unavailable');
  } else if (error.statusCode === 404) {
    // Not found
    console.error('Resource not found');
  } else {
    // Other errors
    console.error('Unexpected error:', error.message);
  }
}
```

## Rate Limiting (Future)

Future implementation will include rate limiting:

```typescript
// Future: Rate limit headers in responses
{
  'X-RateLimit-Limit': '1000',
  'X-RateLimit-Remaining': '999',
  'X-RateLimit-Reset': '1642252800'
}
```

## Best Practices

1. **Always use HTTPS in production**
2. **Store API keys securely** (environment variables, secret managers)
3. **Implement retry logic** with exponential backoff
4. **Validate webhook signatures** to prevent tampering
5. **Handle rate limits gracefully**
6. **Log integration errors** for debugging
7. **Use idempotency keys** for payment operations
8. **Test integrations in sandbox environments** before production
