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

## Stage 6 — Seller inventory and preorder capacity

- Add optional per-variant stock or preorder capacity, an explicit unlimited
  mode, and an availability switch.
- Reserve capacity atomically during order creation and prevent concurrent
  requests from exceeding the limit.
- Release capacity for a declined or cancelled unpaid order; define separate
  handling for paid orders when payments are enabled.
- Display remaining availability publicly without exposing seller-only
  inventory controls. Decide whether sellers can accept backorders.

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

## Stage 8 — Notifications

- Create an outbox for order-created, seller-decision and fulfillment events so
  notifications can retry without duplicating or losing state changes.
- Start with in-app order history; add email/SMS only after consent, provider,
  delivery and opt-out requirements are decided.
- Do not put sensitive order details in push or SMS previews.

## Stage 9 — Buyer support, cancellation and disputes

- Define which unpaid orders can be cancelled by buyers and when seller/admin
  intervention is required.
- Add a support case linked to an order, with buyer/seller/admin visibility
  rules and an auditable status history.
- Defer paid-order refunds and financial dispute resolution until payment and
  refund provider workflows exist.

## Stage 10 — Operations tools

- Add filters and queues for pending seller decisions, stalled fulfillment,
  suspended sellers, cancellations and support cases.
- Keep administrative status changes constrained to valid operational actions;
  payment statuses must come from verified payment processing.
- Provide an audit trail and safe reason fields for every privileged action.

## Stage 11 — Listing quality and media

- Add multiple images through controlled storage with file validation and
  moderation before public display.
- Improve seller descriptions, delivery estimates, variant-specific images and
  listing previews.
- Add reporting and takedown actions without changing existing sourcing
  catalog management.

## Stage 12 — Release readiness

- Review mobile layouts, keyboard navigation, screen-reader labels, loading and
  error states, and slow-network behavior.
- Exercise RLS and transition rules using customer, verified seller, suspended
  seller, supplier, admin and anonymous identities.
- Add operational monitoring, backup/restore checks, migration rehearsal and a
  rollback plan before production release.

## Deferred decisions

- Payment gateway and provider account credentials.
- Whether a seller must wait for payment before confirming stock or accepting
  the preorder. Current seller acceptance is only an availability decision.
- Customer contact sharing point, seller cancellation policy, backorders,
  notification channels, and paid-order refund rules.
