/**
 * Payment adapter interface for supporting multiple payment providers
 * Allows swapping between Stripe, PayPal, Square, etc.
 */

export interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
  customerId?: string;
}

export interface CreatePaymentIntentResult {
  paymentIntentId: string;
  clientSecret: string;
  status: string;
}

export interface RefundPaymentParams {
  paymentIntentId: string;
  amount?: number; // Partial refund if specified
  reason?: string;
}

export interface RefundPaymentResult {
  refundId: string;
  amount: number;
  status: string;
}

export interface IPaymentAdapter {
  /**
   * Provider name (e.g., "stripe", "paypal")
   */
  getName(): string;

  /**
   * Create a payment intent
   */
  createPaymentIntent(
    params: CreatePaymentIntentParams,
  ): Promise<CreatePaymentIntentResult>;

  /**
   * Confirm a payment
   */
  confirmPayment(paymentIntentId: string): Promise<boolean>;

  /**
   * Refund a payment
   */
  refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult>;

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: Buffer, signature: string): boolean;
}

/**
 * Mock payment adapter for testing
 */
export class MockPaymentAdapter implements IPaymentAdapter {
  getName(): string {
    return 'mock';
  }

  async createPaymentIntent(
    params: CreatePaymentIntentParams,
  ): Promise<CreatePaymentIntentResult> {
    return {
      paymentIntentId: `pi_mock_${Date.now()}`,
      clientSecret: `secret_mock_${Date.now()}`,
      status: 'requires_payment_method',
    };
  }

  async confirmPayment(paymentIntentId: string): Promise<boolean> {
    console.log(`Mock: Confirming payment ${paymentIntentId}`);
    return true;
  }

  async refundPayment(
    params: RefundPaymentParams,
  ): Promise<RefundPaymentResult> {
    return {
      refundId: `re_mock_${Date.now()}`,
      amount: params.amount || 0,
      status: 'succeeded',
    };
  }

  verifyWebhookSignature(payload: Buffer, signature: string): boolean {
    return true; // Always valid for mock
  }
}
