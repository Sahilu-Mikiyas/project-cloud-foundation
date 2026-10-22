# Shanta experience redesign roadmap

## Goal

Give Shanta a polished, welcoming storefront with clear product discovery and
distinct paths for local seller listings and Dubai sourcing. Use the reference
site's editorial typography, generous spacing, strong hero, grouped navigation,
curated content sections and visible trust signals as inspiration. Keep Shanta's
own identity, warm market palette and commerce rules. This is a presentation and
navigation redesign: it must preserve current sourcing, seller, order, support,
notification, moderation and operations capabilities.

## Product classification

Every shopper-facing product and journey should make these distinctions clear:

- **Local seller listings** — products offered and priced by verified Shanta
  sellers. A listing can be advertised before it is ready; preorder availability,
  seller-set ETB price, deposit due and estimated delivery must be visible.
- **Dubai sourcing** — Shanta-managed products requested from Dubai through the
  existing sourcing and verified partner assignment flow.
- **Departments and categories** — the catalog's existing category records
  organize products across both channels. Selecting a category must never
  silently switch or hide the chosen product channel.
- **Order state** — a seller preorder awaiting seller response, a sourcing
  reservation, a deposit due, a paid/confirmed state (only when verified by a
  future provider), and fulfillment progress are separate facts. The UI must
  never imply that an unpaid deposit was collected.

## Visual direction

- Use warm ivory surfaces, near-black typography, a restrained burnt-orange
  action color, and green only for trust/success states. Keep contrast accessible.
- Pair an expressive editorial serif for display headings with a clear sans-serif
  for controls, prices and body copy. Use generous white space and a consistent
  rounded card/image treatment.
- Use real product/media assets already available or approved through the
  moderated media flow. Do not invent seller names, reviews, prices or stock.
- Build responsive page sections with clear content hierarchy. On mobile,
  navigation, search, filters and ordering actions must stay easy to reach.
- Use motion sparingly and respect reduced-motion preferences.

## Classified implementation stages

### R1 — Visual foundation and buyer discovery (current)

- Establish shared color, type, spacing, radius, focus and surface tokens.
- Refresh the global header/footer and navigation groupings without removing
  role-aware links, account access, notifications or sign-out.
- Redesign the home page around a clear Shanta promise, working product search,
  channel/category discovery, curated product cards and trust explanation.
- Improve the shop page with clear channel and category filters, searchable
  listings, responsive product cards, loading/error/empty states and result
  counts. Filters remain composable.
- Preserve existing database queries, links, and order-creation behavior.

### R2 — Product detail and preorder decision

- Organize product media, channel and seller/source attribution, option selection,
  availability, delivery estimate and price summary into a readable hierarchy.
- Make seller preorder price, deposit due and remaining balance explicit without
  offering online payment. Explain that creating a preorder is not paying it.
- Make Dubai sourcing distinct and retain its partner/delivery expectations.
- Improve mobile sticky/visible order action only if it does not hide terms or
  accessibility focus.

### R3 — Customer account and order journeys

- Group orders by seller preorder and Dubai sourcing, with statuses and next
  actions understandable at a glance.
- Refresh order detail, support case/messages, cancellation and notifications;
  preserve permissions and transition rules.
- Provide clear empty, loading, retry and permission-denied states.

### R4 — Seller workspace and storefront

- Classify seller tasks into overview, listings, orders, support and account.
- Make listing lifecycle states clear: draft, scheduled/advertised, published,
  paused and rejected where supported. Do not invent a scheduling capability;
  if early-advertisement requires new data/workflow, define it separately before
  implementation.
- Present seller price, deposit terms, inventory/preorder limit, delivery
  estimate, description, options and moderated media in a clean listing editor.
- Separate the public shopper preview from private seller controls.

### R5 — Supplier and operations workspaces

- Group supplier application and eligible sourcing assignment work without
  exposing seller preorders or unauthorized buyer information.
- Organize admin work into queues for seller review, media, orders, support,
  cancellations, suppliers and audit history.
- Preserve reason capture, actor/time history and database-controlled decisions.

### R6 — Responsive and accessibility polish

- Verify mobile, tablet and desktop layouts; keyboard, focus, screen reader,
  zoom, reduced motion, image alternatives and form announcements.
- Refine empty/loading/error/retry behavior and throttled-network resilience.
- Complete the separate release-readiness runbook against staging before calling
  the product production-ready.

## Non-goals and invariants

- This roadmap does not replace the current seller marketplace or Dubai sourcing
  workflow and does not change database permissions, prices or order transitions
  merely for visual convenience.
- No payment gateway selection, online deposit collection, refund workflow or
  paid fulfillment transition is included. Payment remains on hold.
- Keep implementation reviewable as one stage per branch and pull request. The
  release-readiness PR already in progress remains separate and unchanged.
- Stage R1 must keep public catalog filtering aligned with RLS and must not show
  draft or unapproved seller media.
