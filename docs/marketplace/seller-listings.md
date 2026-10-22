# Seller listings

Seller listings add a second catalog channel alongside Shanta's Dubai sourcing
products.

## Current implementation

- A signed-in user can submit a seller application from the seller and partner
  portal.
- Operations can verify, reject or suspend the seller account.
- Verified sellers can create product drafts, set an ETB price and deposit
  percentage, provide variants and an image URL, and publish or pause a listing.
- Sellers can update the price and deposit percentage of their listings.
- Published listings appear in the same catalog grid as sourcing products and
  can be filtered by channel.
- The storefront labels each product as a seller listing or Dubai sourcing.
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
- A seller listing detail page currently shows its deposit terms but does not
  create a preorder. Buyer order creation, payment confirmation and immutable
  order price snapshots belong to the next order-flow stage.

## Current limits

- Product images use a URL; direct image upload and moderation are not included
  in this stage.
- Listing inventory limits and seller fulfillment milestones are not included.
- Checkout is disabled for seller listings until the seller preorder order flow
  is implemented.
