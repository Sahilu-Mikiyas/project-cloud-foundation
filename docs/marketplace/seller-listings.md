# Seller listings

Seller listings add a second catalog channel alongside Shanta's Dubai sourcing
products.

## Current implementation

- A signed-in user can submit a seller application from the seller and partner
  portal.
- Operations can verify, reject or suspend the seller account.
- Verified sellers can create product drafts, set an ETB price and deposit
  percentage, provide variants and an image URL, and publish or pause a listing.
- Sellers can set an optional preorder limit per option. A blank limit is
  unlimited; limited availability is checked and reserved atomically when a
  buyer submits a preorder.
- Sellers can update the price and deposit percentage of their listings.
- Published listings appear in the same catalog grid as sourcing products and
  can be filtered by channel.
- The storefront labels each product as a seller listing or Dubai sourcing.
- Buyers can submit seller preorders. The order and item store snapshots of the
  listing name, option, price and deposit terms used at submission.
- Sellers can accept a pending preorder to confirm availability or decline it,
  which cancels the unpaid order. Acceptance does not mean the deposit was paid
  and does not start preparation or delivery.
- Order submissions are idempotent, so retrying the same request does not create
  another order. Sellers can see orders for their listings without customer
  contact information.
- Suspending or rejecting a seller unpublishes their listings. Public catalog
  access also checks that a seller remains verified.

## Rules that keep the channels separate

- Existing products remain `sourcing` products and stay owned by Shanta.
- Seller products use `listing_type = 'seller'` and are tied to the seller's
  authenticated user ID.
- Only verified sellers can create, publish or edit their own listings.
- Seller applications and profiles are private to the seller and authorized
  operations staff.
- Seller listing deposits do not create supplier assignment fees.
- A preorder is not paid when it is created. Payment collection and provider
  confirmation are a later stage.
- Seller acceptance confirms availability only. Fulfillment remains blocked
  until payment confirmation is implemented.
- Cancelling or expiring an unpaid seller order releases its committed capacity.
  Delivered orders remain counted against the seller's configured total limit.

## Current limits

- Product images use a URL; direct image upload and moderation are not included
  in this stage.
- Listing inventory limits and seller fulfillment milestones are not included.
- Seller preorder submission records an order but does not collect the deposit.
- Inventory limits, seller fulfillment milestones and payment collection are
  not included in this stage.
