# Foundation security and operations

## Administrator provisioning

New sign-ups receive only the `customer` role. Do not grant administrator access
based on email address, signup order, browser state, or user-editable metadata.

An existing administrator or trusted database operator can grant the role to a
specific account after verifying the person's identity:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where lower(email) = lower('operator@example.com')
on conflict (user_id, role) do nothing;
```

Run this only in a trusted database console or migration process. Never expose
the Supabase service-role key or an unrestricted role-grant endpoint to the
browser. To remove administrator access, delete the matching `user_roles` row
through the same trusted process.

The migration that changes signup behavior does not remove existing admin role
rows. Review the current `user_roles` table separately before production and
remove any role that was granted unintentionally.

## Environment files

Keep local `.env` files out of Git. The repository's current `.env` contains
Supabase project identifiers, URLs and publishable keys only; these values are
intended for client configuration and are protected by database policies. Keep
service-role keys, database passwords and payment-provider secrets exclusively
in trusted server or deployment secret storage. If a privileged secret is ever
committed, rotate it; deleting it in a later commit does not remove it from Git
history.

Use `.env.example` for variable names and non-secret placeholders. Do not copy
production credentials into local development or preview environments.

## Current access boundaries

- Catalog reads are public only for published products and their variants.
- Customers can read their own orders; administrators can read all orders.
- Verified suppliers can currently read orders in `open_for_assignment` state.
- Supplier applications are tied to the signed-in user and begin as `pending`.
- Catalog writes and supplier review are restricted to administrators.
- Order creation, status changes and supplier review use database functions
  that check the signed-in user and/or administrator role.

These are the current baseline rules, not a complete production security review.
Before adding seller-owned listings, assignments or payments, add corresponding
ownership policies and test them against customer, seller, supplier, admin and
anonymous sessions. Never grant a future seller access by reusing the broad
administrator catalog policy.

## Database change process

1. Add a new sequential SQL migration under `drizzle/migrations/`.
2. Add its tag and monotonically increasing `when` value to
   `drizzle/migrations/meta/_journal.json`.
3. Keep applied migrations immutable; correct mistakes with a later migration.
4. Apply changes to a non-production project first, inspect resulting policies,
   and then promote through the deployment's approved database workflow.
5. Keep browser code on the publishable key and RLS. Use privileged keys only
   in trusted server code, with the smallest possible set of operations.
