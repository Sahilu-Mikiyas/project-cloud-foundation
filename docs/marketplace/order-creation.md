# Buyer order creation

Shanta supports two separate order paths that share order history and item
snapshots.

## Dubai sourcing reservation

- The buyer selects an available sourcing product option and quantity.
- A trusted database function verifies the product is published and marked as a
  sourcing listing, then calculates the ETB subtotal and deposit.
- The order starts as `awaiting_customer_deposit`. It is not yet open for a
  supplier assignment; that must wait for deposit confirmation.

## Seller preorder

- The buyer selects an available option on a published seller listing.
- The database verifies the seller is still verified and prevents the seller
  from ordering their own listing.
- The order stores the seller user ID, order type, ETB subtotal and deposit due.
- Product name, option, image, unit price and quantity are copied to order
  items. Later listing edits do not change the existing order snapshot.
- The seller can see the order status and totals for their listing, without the
  buyer's contact information.

## Retry safety and payment state

The browser creates a request key and keeps it across retries in the current
session. The database enforces one order per customer and key, checks that the
key is not reused with different order inputs, and returns the original order
on a retry. Each order and its item/event records are created in one database
transaction.

Both order paths currently remain `awaiting_customer_deposit`. This records an
order request and the deposit due; it does not prove payment or collect money.
Payment-provider integration will confirm the deposit and move sourcing orders
to supplier assignment or seller orders to `confirmed`.
