# Shanta

Shanta is a cross-border shopping marketplace with two parallel product channels:

- Shanta-managed products sourced through verified partners in markets around the world.
- Seller-managed listings with seller-set prices, preorder terms, and deposits.

The web app uses React, TypeScript, TanStack Start, and Supabase for authentication and data. Payment collection remains a later stage; the database records order and deposit terms without claiming a payment has been collected.

## Supabase project

The application is configured for the Shanta Supabase project `xczypfauwzeaogijcwgj`. Its database schema and initial catalog rows are maintained in `drizzle/migrations`.

Copy `.env.example` to `.env` and set the project's publishable key. Set `SUPABASE_SERVICE_ROLE_KEY` only for trusted server-side code that needs privileged operations; never add it to a `VITE_` variable or browser bundle. Set `SUPABASE_DB_URL` only when running Drizzle migrations locally, and use the connection string from the Supabase dashboard.

## Local development

Install dependencies with Bun, then start the app:

```sh
bun install
bun run dev
```

Available scripts include `bun run build`, `bun run lint`, and `bun run test`.

## Database migrations

SQL migration files are stored in `drizzle/migrations`. Apply schema changes through the Supabase migration workflow for the configured project, and keep the migration files in version control so another environment can be initialized consistently.
