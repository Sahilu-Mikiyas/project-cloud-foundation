# Marketplace release readiness

This runbook turns roadmap Stage 12 into release gates for the existing sourcing
workflow and the additive seller marketplace. It is a checklist and operating
procedure; writing it does not mean the checks have passed. Record evidence and
the person/date for every completed gate before a production release.

## Scope and release decision

- [ ] Confirm the release commit and the pull requests included in it.
- [ ] Confirm the existing Dubai sourcing catalog, reservation, supplier review
  and assignment flows still work.
- [ ] Confirm seller listings, preorder acceptance/decline, inventory limits,
  cancellation, support, notifications, operations queues and moderated media
  work as described in the marketplace roadmap.
- [ ] Keep payment collection disabled. A recorded deposit due is not a payment
  receipt. Do not enable fulfillment transitions that require a verified paid
  state until a payment provider and its verification/reconciliation workflow
  have been implemented and reviewed.
- [ ] Record open defects, severity, owner and release decision. Block release
  for data exposure, unauthorized writes, incorrect price/deposit snapshots,
  duplicate order creation, inventory overcommit, or unrecoverable migration
  risk.

| Release | Commit | Environment | Reviewer | Date | Decision |
| --- | --- | --- | --- | --- | --- |
| _Fill in_ | _Fill in_ | _Staging/production_ | _Fill in_ | _Fill in_ | _Go/no-go_ |

## Preview and staging smoke checks

Use a non-production Supabase project and a Vercel preview deployment. Confirm
the deployment uses the intended project URL and publishable key; never place a
service-role key, database password or provider secret in client-exposed
variables. Keep production and preview credentials separate.

- [ ] Open the deployed preview in a private browser session and confirm the
  landing page and catalog load without console or server errors.
- [ ] Sign up as a customer, sign in, sign out, and verify session refresh and
  recovery behavior.
- [ ] As an anonymous visitor, browse published catalog listings and approved
  images; confirm drafts, unapproved images, orders and private support content
  are not visible.
- [ ] As a customer, place a sourcing reservation and a seller preorder; verify
  each appears in the correct history and order type remains distinct.
- [ ] Verify the displayed price and deposit are server-derived, the order
  retains its price snapshot after a seller edits the listing, and retrying the
  same request key does not create a second order.
- [ ] As a verified seller, publish/pause a listing, edit its description and
  delivery estimate, upload media, preview the listing, respond to an order,
  and view only the seller's own orders/support cases.
- [ ] As a suspended seller, verify listing mutations, uploads and seller
  decisions are rejected even if a stale browser page is used.
- [ ] Exercise limited preorder capacity with requests at, below and above the
  limit; confirm cancellation releases reserved capacity once and concurrent
  requests cannot exceed the configured limit.
- [ ] Exercise buyer cancellation while awaiting deposit, support case/message
  creation, seller/admin replies, notification creation/read state, and the
  relevant operations queues and audit reasons.
- [ ] As an administrator, review seller applications, media reports and
  operational queues; verify privileged decisions require reasons and are
  recorded with the correct actor and entity.
- [ ] As a supplier, verify only eligible sourcing orders open for assignment
  are visible; seller preorders and unrelated customer data remain unavailable.
- [ ] Confirm payment attempts/events cannot be created or marked successful by
  a browser user and there is no user-visible claim that a deposit was paid.

Do not seed production with these test identities. Remove or disable staging
accounts and test data after the rehearsal.

## Access-control and transition matrix

Run each row using a separate account/session in the staging project. Check both
the UI and the underlying request result: hiding a button is not an authorization
control. For denied operations, verify no row or storage object changed.

| Identity | Expected allowed access | Must be denied |
| --- | --- | --- |
| Anonymous | Published catalog and approved media | Drafts, seller/customer data, orders, support, notifications, media reports, all writes |
| Customer | Own profile, orders, order events, notifications and participant support; own eligible unpaid cancellation | Other customers' records, seller/admin tools, privileged transitions, arbitrary order prices/statuses |
| Verified seller | Own seller profile/listings/media; own preorder decisions and participating support/order summaries | Other sellers' data, buyer contact data outside an explicitly authorized step, admin queues, arbitrary order transitions |
| Suspended seller | Public catalog as an ordinary visitor; own read access only where policy allows | Listing changes, publish actions, uploads, media removal, seller decisions and seller-only queues |
| Supplier | Own supplier application/profile and eligible sourcing assignments | Seller preorders, unrelated orders, customer contact data before assignment, seller/admin writes |
| Administrator | Operational queues, all required moderation/review actions and audit history | Directly bypassing required database transition functions or omitting required action reasons |

For every state-changing operation, verify its accepted source and destination
states, actor, timestamp, reason (where required), duplicate/retry behavior,
concurrent-call behavior, and audit/notification side effects. Include declined,
cancelled, expired and delivered terminal cases where applicable. Capture test
identity, request/action, expected result, observed result and evidence link in
the release record.

## Accessibility, responsive layout and failure states

Test current supported browsers and at least one narrow mobile viewport, tablet
viewport and desktop viewport. Include catalog/product detail, seller listing
editor, upload/review flows, order history/detail, support and admin queues.

- [ ] Complete primary buyer, seller and admin tasks using keyboard only. Check
  logical tab order, visible focus, escape/close behavior for dialogs, and no
  keyboard traps.
- [ ] Check form labels, required/error announcements, button names, image
  alternatives, heading hierarchy, status announcements, and table/list
  semantics with a screen reader.
- [ ] Confirm content reflows at narrow widths without horizontal page
  scrolling; controls remain usable with touch and browser zoom.
- [ ] Check focus returns to the invoking control after closing dialogs and
  focus moves to meaningful content after route changes or submitted errors.
- [ ] For catalog, order, support and admin screens, verify loading, empty,
  permission-denied, validation, server-error and retry states are clear.
- [ ] Throttle network and test delayed/failed catalog reads, order submission,
  image upload, notification updates and support messages. Show pending state,
  prevent accidental duplicate submissions, preserve recoverable form input,
  and provide a retry path without implying success before confirmation.
- [ ] Check image upload progress, size/type errors and interrupted upload
  behavior. A failed upload must not appear as approved media.

Record browser/device, viewport, assistive technology where used, finding,
severity and evidence. Fix critical task blockers and accessibility failures
before release.

## Database migration rehearsal and recovery

Migrations are sequential and immutable. Rehearse against a disposable or
staging Supabase project first. Do not apply a migration from this checklist to
production, and do not assume that an application rollback reverses database
changes.

1. Record the target project's current migration/version state and confirm a
   recent recoverable backup exists.
2. Create a fresh disposable project or restore a backup to an isolated project.
3. Apply migrations in order from the project's documented deployment process;
   inspect each result, the migration journal, RLS enablement/policies, grants,
   functions, triggers and Storage policies.
4. Run the smoke checks and access matrix above against the migrated project.
5. Test application rollback to the previous deploy while keeping the new
   additive schema in place. Verify the old application still starts and its
   essential flows remain safe. Prefer forward-fix migrations over destructive
   schema rollback once data may have been written.
6. Record duration, migration identifiers, errors, schema diff, backup
   reference, application rollback result and an owner for any follow-up.

Before production, the operator must document the actual Supabase backup/restore
method and retention available to this project. Perform a restore rehearsal to
an isolated project and verify that expected tables, policies, Storage metadata
and required objects can be recovered. A backup existing is not proof that it
can be restored.

| Rehearsal | Project (non-secret identifier) | Migrations | Backup/restore evidence | Result | Operator/date |
| --- | --- | --- | --- | --- | --- |
| _Fill in_ | _Fill in_ | _Fill in_ | _Fill in_ | _Pass/fail_ | _Fill in_ |

## Monitoring and incident response

Before launch, identify who receives and acts on alerts. At minimum, inspect
Vercel deployment/runtime logs and Supabase database/API/auth/storage health
using the monitoring available for the selected plans. Set thresholds only
after a baseline is observed; alert on sustained error spikes, failed deploys,
database/API unavailability, storage upload failures, and backup/restore
problems where the provider exposes those signals.

For an incident, record start time, affected environment and user flows, recent
deploy/migration, observed evidence and owner. First mitigate by rolling back
the application deployment when safe; do not manually edit production data or
reverse an applied migration without a reviewed recovery plan. Preserve logs,
notify affected users through the agreed channel when required, and record the
corrective action and follow-up.

| Signal | Source | Owner/on-call | Alert or review cadence | Runbook/evidence |
| --- | --- | --- | --- | --- |
| Deployment/build/runtime errors | Vercel | _Fill in_ | _Fill in_ | _Fill in_ |
| Database/API/auth/storage health | Supabase | _Fill in_ | _Fill in_ | _Fill in_ |
| Order creation and transition failures | Application/database logs | _Fill in_ | _Fill in_ | _Fill in_ |
| Backup and restore readiness | Supabase project operations | _Fill in_ | _Fill in_ | _Fill in_ |

## Vercel deployment checklist

- [ ] Confirm the Vercel project is linked to the intended Git repository and
  production branch; preview deployments should not use production secrets or
  production database credentials.
- [ ] Confirm the configured framework/build command and output are compatible
  with the repository's TanStack Start/Vite setup; review the deployment build
  log rather than relying only on the generic failure page.
- [ ] Set only required environment variables in the correct Vercel scopes and
  redeploy after changing them. Keep server-only secrets out of `VITE_` client
  variables and browser bundles.
- [ ] Verify the deployed URL directly and exercise deep links/refreshes on
  catalog, product detail, auth, seller and order routes.
- [ ] If a deployment fails, capture the failed deployment URL, commit SHA,
  build/runtime log excerpt, environment scope (without secret values), and
  whether a previous deployment still serves traffic.
- [ ] Promote only after preview gates pass; retain a known-good deployment
  reference and a named operator authorized to roll back.

## Exit criteria

Stage 12 is ready for production consideration only when all release-blocking
checks above have dated evidence in the release record, access-control and
transition checks pass for all six identities, a migration and restore
rehearsal succeeds, Vercel preview routes work, critical accessibility and
slow-network issues are resolved, and an operational owner is assigned.

Payment collection remains a separate deferred decision and release gate.
