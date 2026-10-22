# In-app order notifications

Notifications are generated from order events, so the alert is committed in the
same database transaction as the event that caused it.

## Recipients

- A seller receives an alert when a buyer creates a preorder for one of the
  seller's listings.
- A buyer receives an alert when the seller accepts or declines that preorder.
- Buyers and sellers receive later order status updates when an authorized
  actor records them. The actor does not receive their own event as a new alert.
- Sourcing reservation creation does not send a duplicate alert to the buyer;
  the order confirmation page already confirms that action.

Notification text includes the order reference and a short status message. It
does not include customer contact details or raw event notes. Users can read
only their own notifications and mark them read through a database function.

The header shows an unread count and the account page lists recent alerts. The
count and list refresh periodically while open. Email, SMS and push delivery
remain deferred until consent and delivery requirements are decided.
