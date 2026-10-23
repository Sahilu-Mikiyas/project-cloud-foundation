# Marketplace implementation roadmap

This roadmap adds seller marketplace capabilities alongside the existing Dubai
sourcing and supplier workflow. It does not replace that workflow. Payment
collection stays on hold until Shanta selects a gateway.

## Principles for every stage

- Keep sourcing orders and seller listing orders explicitly distinguishable.
- Make the database the authority for ownership, price, order transitions and
  duplicate requests. Browser controls are presentation, not authorization.
- Do not expose customer contact details to sellers until a defined fulfillment
  step requires them and access rules are reviewed.
- Store immutable order item and price snapshots so listing edits cannot alter
  an existing preorder.
- Keep money in integer ETB santim. Never trust a client supplied amount.
- Add an additive migration and generated database types for every schema
  change; keep applied migrations immutable.
- Ship one reviewable stage per branch and pull request. Do not apply migrations
  to production as part of code implementation.

## Stage 1 — Foundation and access boundaries (complete)

- Secure first administrator provisioning and remove tracked environment
  credentials.
- Preserve existing sign-in, catalog, and Dubai sourcing behavior.
- Document trusted role provisioning and secret handling.

## Stage 2 — Seller onboarding and listings (complete)

- Seller applications and operations review with verified/suspended states.
- Seller-owned product drafts, variants, ETB price, deposit terms and publish or
  pause controls.
- Public catalog placement and channel labels, with RLS and seller ownership
  checks.

## Stage 3 — Buyer order creation (complete)

- Keep sourcing reservation and seller preorder as separate server-validated
  paths.
- Calculate totals and deposits from the current database price, snapshot line
  items and protect retries with idempotency keys.
- Display order history and seller order summaries without buyer contact
  details.
- Record the deposit due without claiming that it has been paid.

## Stage 4 — Provider-neutral payment foundation (complete; collection held)

- Define a server-only provider contract and private payment attempt and event
  tables.
- Keep checkout and order confirmation disabled until a gateway is selected
  and its credentials, callback verification and reconciliation behavior are
  ready.

## Stage 5 — Seller preorder review (implemented in current work)

- Give the verified listing owner an atomic accept/decline decision for a
  pending seller preorder.
- Acceptance means the seller confirms they can fulfill the requested listing
  at its stored terms. It does not mean the deposit is paid and does not start
  preparation or delivery.
- Declining cancels the preorder and records the reason as a system event; no
  money is collected or refunded in this stage.
- Show the decision and its timestamp to both buyer and seller. Keep unrelated
  sourcing orders and admin access unchanged.
- Test ownership, seller verification, repeated requests, competing decisions,
  cancelled orders, and buyer/seller/admin/anonymous read boundaries before
  release.

## Stage 6 — Seller inventory and preorder capacity (implemented in current work)

- Add an optional per-variant preorder limit; a blank limit means unlimited.
- Reserve capacity atomically during seller order creation and prevent
  concurrent requests from exceeding the limit.
- Release capacity when an unpaid order is cancelled or expired. Paid-order
  cancellation and refund handling remains deferred until payment is enabled.
- Show remaining limited capacity on the product page and let sellers adjust
  the limit without going below units already committed.
- A limit represents the total accepted order quantity for the variant;
  delivered orders continue to count as consumed capacity.

## Stage 7 — Seller fulfillment milestones (after deposit confirmation)

- Add explicit seller preparation and handoff/delivery actions only after the
  order reaches the trusted paid/confirmed state.
- Enforce allowed transitions in a database function; record actor and time for
  each transition.
- Keep seller access limited to the seller's own orders and only the customer
  information needed for the authorized fulfillment step.
- Let buyers see progress and a clear terminal delivered/cancelled state.
- This stage depends on payment confirmation for seller preorders. Until a
  gateway is chosen, implement the data model and UI only if they cannot imply
  that an unpaid order is being fulfilled.

## Stage 8 — Notifications (in-app order alerts implemented)

- Order creation and seller-decision events create private, durable in-app
  notifications in the same transaction; unique event/user keys prevent
  duplicates.
- Users can see and mark their own notifications read. A later external
  delivery outbox can add retryable email/SMS after consent, provider, delivery
  and opt-out requirements are decided.
- Do not put sensitive order details in push or SMS previews.

## Stage 9 — Buyer support, cancellation and disputes (implemented)

- Buyers can cancel only their own orders while the order is awaiting a deposit.
  The database records the reason and status event; the existing inventory
  trigger releases seller preorder capacity atomically.
- Buyers can open one active support case per order, select a category, and
  exchange private messages with the relevant seller and operations admins.
- Admins can review a support queue, reply, and change a case status. Status
  changes are recorded with actor, time and reason.
- Paid-order refunds and financial dispute resolution remain deferred until
  payment and refund provider workflows exist.

## Stage 10 — Operations tools (implemented)

- Add operations queues for pending seller decisions, fulfillment orders older
  than seven days, suspended sellers, cancellations and open support cases.
- Add a recent admin-action queue with actor time, entity, action and reason.
- Require a reason for privileged case, order, seller and supplier actions and
  persist the reason in the audit log.
- Restrict manual order status changes to cancellation or expiry from eligible
  unpaid or unfulfilled states. Payment and dispute statuses remain controlled
  by their verified workflows.

## Stage 11 — Listing quality and media (implemented)

- Add private seller listing media storage with JPEG, PNG and WebP allowlists,
  a 5 MB file limit, client signature checks, seller/product path ownership,
  and row-level moderation before shoppers can access images.
- Support seller image galleries and images tied to a product option. Product
  pages display the approved gallery for the selected option.
- Add seller editing for descriptions and delivery estimates with a customer
  preview.
- Add signed-in image reports and an admin review queue. Admin rejection hides
  the image and records the action and reason in the operations audit log.
- Existing sourcing catalog management remains unchanged.

## Stage 12 — Release readiness (runbook added; environment verification pending)

- Follow [`release-readiness.md`](release-readiness.md) for the release record,
  staging smoke checks, access-control matrix, accessibility and slow-network
  review, migration/restore rehearsal, monitoring ownership and Vercel checks.
- Review mobile layouts, keyboard navigation, screen-reader labels, loading and
  error states, and slow-network behavior.
- Exercise RLS and transition rules using customer, verified seller, suspended
  seller, supplier, admin and anonymous identities.
- Add operational monitoring, backup/restore checks, migration rehearsal and a
  rollback plan before production release. Do not mark this stage complete
  until the runbook contains evidence from the configured staging and recovery
  environment.

## Deferred decisions

- Payment gateway and provider account credentials.
- Whether a seller must wait for payment before confirming stock or accepting
  the preorder. Current seller acceptance is only an availability decision.
- Customer contact sharing point, seller cancellation policy, backorders,
  notification channels, and paid-order refund rules.
