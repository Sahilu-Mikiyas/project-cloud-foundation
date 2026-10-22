create type public.payment_attempt_status as enum (
  'pending',
  'checkout_started',
  'succeeded',
  'failed',
  'cancelled',
  'expired'
);

create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null check (length(trim(provider)) > 0),
  purpose text not null default 'customer_deposit'
    check (purpose = 'customer_deposit'),
  amount_etb_cents bigint not null check (amount_etb_cents > 0),
  currency text not null default 'ETB' check (currency = 'ETB'),
  status public.payment_attempt_status not null default 'pending',
  idempotency_key uuid not null,
  provider_reference text,
  checkout_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, idempotency_key),
  unique (provider, provider_reference)
);

create index payment_attempts_order_created_idx
  on public.payment_attempts (order_id, created_at desc);

alter table public.payment_attempts enable row level security;

-- Provider references and checkout links can be sensitive. Browser clients
-- cannot read or mutate payment attempts; trusted server code owns this table.
revoke all on public.payment_attempts from anon, authenticated;
grant all on public.payment_attempts to service_role;

create table public.payment_provider_events (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.payment_attempts(id) on delete restrict,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_result text,
  unique (provider, provider_event_id)
);

alter table public.payment_provider_events enable row level security;
revoke all on public.payment_provider_events from anon, authenticated;
grant all on public.payment_provider_events to service_role;
