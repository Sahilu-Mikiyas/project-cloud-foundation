# Payment foundation

Payment collection is deliberately separate from order creation. A buyer order
records the deposit due, but it remains `awaiting_customer_deposit` until a
trusted payment integration confirms a matching successful transaction.

## Provider-neutral contract

`src/lib/payments/provider.ts` defines the server-side interface for creating a
checkout, verifying a signed provider notification, and checking payment
status. A provider adapter must use server-held credentials and must treat
browser return URLs as informational; only a verified notification or trusted
provider status lookup can confirm payment.

## Payment records

- `payment_attempts` stores the order, provider, immutable ETB amount, state,
  idempotency key, provider reference and checkout URL.
- `payment_provider_events` stores provider event identifiers and processing
  outcomes so webhook retries can be made idempotent.
- Both tables deny direct browser access. Trusted server code is responsible
  for creating attempts, validating the provider response and updating order
  state in one controlled workflow.

## Not enabled yet

No provider adapter, checkout action, webhook endpoint or payment UI is active
in this phase. The gateway still needs to be selected and configured. The next
payment implementation must validate the signed callback, amount, currency,
merchant reference, event uniqueness and order state before confirming a
deposit. Sourcing orders may then enter supplier assignment; seller preorders
may then become confirmed.
