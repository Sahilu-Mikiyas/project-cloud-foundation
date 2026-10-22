/** Provider-neutral payment contracts. Implementations belong in server-only files. */
export type PaymentCurrency = "ETB";

export type PaymentProviderStatus =
  | "pending"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "expired";

export interface CreatePaymentCheckoutInput {
  /** Stable Shanta order reference, never a client supplied amount. */
  merchantReference: string;
  amountEtbCents: number;
  currency: PaymentCurrency;
  idempotencyKey: string;
  returnUrl: string;
  callbackUrl: string;
}

export interface PaymentCheckout {
  providerReference: string;
  checkoutUrl: string;
  expiresAt?: string;
}

export interface VerifiedPaymentNotification {
  providerEventId: string;
  providerReference: string;
  merchantReference: string;
  amountEtbCents: number;
  currency: PaymentCurrency;
  status: PaymentProviderStatus;
  occurredAt?: string;
}

export interface PaymentProvider {
  readonly id: string;
  createCheckout(input: CreatePaymentCheckoutInput): Promise<PaymentCheckout>;
  verifyNotification(input: {
    headers: Headers;
    rawBody: string;
  }): Promise<VerifiedPaymentNotification>;
  getPaymentStatus(providerReference: string): Promise<VerifiedPaymentNotification>;
}
