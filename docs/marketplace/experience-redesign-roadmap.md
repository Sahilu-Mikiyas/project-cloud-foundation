# Shanta experience redesign roadmap

## Goal

Give Shanta a polished, welcoming storefront with clear product discovery and
distinct paths for local seller listings and Dubai sourcing. Use the reference
site's editorial typography, generous spacing, strong hero, grouped navigation,
curated content sections and visible trust signals as inspiration. Keep Shanta's
own identity and commerce rules. This is a presentation and
navigation redesign: it must preserve current sourcing, seller, order, support,
notification, moderation and operations capabilities.

## Reference implementation

The source of the visual reference is
[addis-living-hub-fdc1fa93](https://github.com/Sahilu-Mikiyas/addis-living-hub-fdc1fa93),
especially `src/styles.css`, `src/components/layout/Header.tsx`,
`src/components/home/Hero.tsx`, `src/components/home/ValueProps.tsx` and
`src/components/listings/ListingCard.tsx`. Reuse its design principles—Fraunces
and Inter, black/white with restrained gold, compact grouped navigation, a
photo-led hero, rounded 4:3 cards and crisp information hierarchy—while using
Shanta's own product data, labels and workflows.

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

- Follow the reference's clean black-and-white base, restrained gold accent,
  generous white space, and rounded surfaces; keep green reserved for semantic
  trust/success states and preserve accessible contrast.
- Use Fraunces for display headings and Inter for controls, prices and body copy.
  Use the reference's large photographic hero, subtle gradients, clear card
  hierarchy and 4:3 product photography where the content suits it.
- Use real product/media assets already available or approved through the
  moderated media flow. Do not invent seller names, reviews, prices or stock.
- Keep primary navigation compact and group secondary destinations under
  Discover. Provide a deliberate mobile menu that retains channel, partner and
  account access.
- Build responsive page sections with clear content hierarchy. On mobile,
  navigation, search, filters and ordering actions must stay easy to reach.
- Use motion sparingly and respect reduced-motion preferences.

## Classified implementation stages

### R1 — Visual foundation and buyer discovery (complete)

- Establish shared color, type, spacing, radius, focus and surface tokens.
- Refresh the global header/footer and navigation groupings without removing
  role-aware links, account access, notifications or sign-out.
- Redesign the home page around a clear Shanta promise, working product search,
  channel/category discovery, curated product cards and trust explanation.
- Improve the shop page with clear channel and category filters, searchable
  listings, responsive product cards, loading/error/empty states and result
  counts. Filters remain composable.
- Preserve existing database queries, links, and order-creation behavior.
- Apply the visual system consistently to sign-in, order history, order detail,
  seller/partner workspace, and operations: Fraunces display type, restrained
  gold accents, generous spacing, rounded cards, and responsive navigation.
- Add restrained entrance and in-view motion, image drift, card hover feedback,
  and menu transitions. Respect reduced-motion preferences and preserve usable
  content when IntersectionObserver is unavailable.

### R2 — Product detail and preorder decision (complete)

- Organize product media, channel and seller/source attribution, option selection,
  availability, delivery estimate and price summary into a readable hierarchy.
- Make seller preorder price, deposit due and remaining balance explicit without
  offering online payment. Explain that creating a preorder is not paying it.
- Make Dubai sourcing distinct and retain its partner/delivery expectations.
- Improve mobile sticky/visible order action only if it does not hide terms or
  accessibility focus.

### R3 — Customer account and order journeys (complete)

- Group orders by seller preorder and Dubai sourcing, with statuses and next
  actions understandable at a glance.
- Refresh order detail, support case/messages, cancellation and notifications;
  preserve permissions and transition rules.
- Provide clear empty, loading, retry and permission-denied states.

### R4 — Seller workspace and storefront (complete)

- Classify seller tasks into overview, listings, preorders, support and account
  access. The current workspace provides a summary/action queue, focused listing
  editor, preorder review queue, support conversation list and account link.
- Explain that sellers may advertise products before they are ready, set the
  product price and deposit terms, and review buyer preorder requests. Continue
  to state that a submitted preorder does not collect payment while the gateway
  is on hold.
- Make listing lifecycle states clear: draft, scheduled/advertised, published,
  paused and rejected where supported. Do not invent a scheduling capability;
  if early-advertisement requires new data/workflow, define it separately before
  implementation.
- Present seller price, deposit terms, inventory/preorder limit, delivery
  estimate, description, options and moderated media in a clean listing editor.
- Separate the public shopper preview from private seller controls.
- The current product schema stores only `is_published`, so it cannot distinguish
  a never-published draft from a previously published listing that was paused.
  Keep the UI accurate to this limitation; schedule dates and richer lifecycle
  states require a separate data/workflow design.

### R5 — Supplier and operations workspaces (current)

- Group the verified sourcing-partner experience into overview, open Dubai
  sourcing requests and partner profile. Keep the application status visible
  and separate sourcing requests from seller preorders.
- Make operations open on an actionable overview with counts for pending seller
  decisions, stalled fulfillment, support cases and cancellations.
- Keep admin areas for orders, catalog, sourcing partners, sellers, support,
  media review and audit history clearly named and easy to navigate.
- Preserve reason capture, actor/time history and database-controlled decisions.
- Do not add sourcing request claiming, assignment fee payment, or new admin
  actions as part of this workspace redesign.

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

