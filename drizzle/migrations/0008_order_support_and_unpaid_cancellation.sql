create type public.support_case_status as enum (
  'open',
  'in_progress',
  'waiting_on_customer',
  'resolved',
  'closed'
);

create table public.support_cases (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  opened_by uuid not null references auth.users(id),
  subject text not null check (char_length(subject) between 4 and 120),
  category text not null check (category in ('order_status', 'listing_or_product', 'seller_communication', 'other')),
  status public.support_case_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index support_cases_order_created_idx
  on public.support_cases (order_id, created_at desc);
create index support_cases_status_updated_idx
  on public.support_cases (status, updated_at desc);
create unique index support_cases_one_open_per_order
  on public.support_cases (order_id)
  where status in ('open', 'in_progress', 'waiting_on_customer');

create table public.support_case_messages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.support_cases(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index support_case_messages_case_created_idx
  on public.support_case_messages (case_id, created_at);

create table public.support_case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.support_cases(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  status public.support_case_status not null,
  note text not null check (char_length(note) between 1 and 500),
  created_at timestamptz not null default now()
);
create index support_case_events_case_created_idx
  on public.support_case_events (case_id, created_at);

alter table public.support_cases enable row level security;
alter table public.support_case_messages enable row level security;
alter table public.support_case_events enable row level security;

create policy "support cases visible to order participants"
  on public.support_cases for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.customer_id = (select auth.uid())
        or o.seller_id = (select auth.uid())
        or public.has_role((select auth.uid()), 'admin'))
  ));

create policy "support messages visible to case participants"
  on public.support_case_messages for select to authenticated
  using (exists (
    select 1 from public.support_cases c
    join public.orders o on o.id = c.order_id
    where c.id = case_id
      and (o.customer_id = (select auth.uid())
        or o.seller_id = (select auth.uid())
        or public.has_role((select auth.uid()), 'admin'))
  ));

create policy "support history visible to case participants"
  on public.support_case_events for select to authenticated
  using (exists (
    select 1 from public.support_cases c
    join public.orders o on o.id = c.order_id
    where c.id = case_id
      and (o.customer_id = (select auth.uid())
        or o.seller_id = (select auth.uid())
        or public.has_role((select auth.uid()), 'admin'))
  ));

revoke all on public.support_cases, public.support_case_messages, public.support_case_events from public, anon, authenticated;
grant select on public.support_cases, public.support_case_messages, public.support_case_events to authenticated;
grant all on public.support_cases, public.support_case_messages, public.support_case_events to service_role;

create function public.cancel_unpaid_order(_order_id uuid, _reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if _reason is null or char_length(btrim(_reason)) < 3 or char_length(_reason) > 500 then
    raise exception 'Provide a cancellation reason between 3 and 500 characters';
  end if;

  select * into target_order
  from public.orders
  where id = _order_id and customer_id = auth.uid()
  for update;
  if not found then raise exception 'Order not found'; end if;
  if target_order.status <> 'awaiting_customer_deposit' then
    raise exception 'Only orders awaiting a deposit can be cancelled here';
  end if;

  update public.orders
  set status = 'cancelled', updated_at = now()
  where id = target_order.id;

  insert into public.order_events (order_id, status, note, actor_id)
  values (target_order.id, 'cancelled', 'Buyer cancelled unpaid order: ' || btrim(_reason), auth.uid());
end;
$$;
revoke all on function public.cancel_unpaid_order(uuid, text) from public, anon;
grant execute on function public.cancel_unpaid_order(uuid, text) to authenticated;

create function public.create_order_support_case(
  _order_id uuid,
  _subject text,
  _category text,
  _message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  case_id uuid;
  order_row public.orders%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if _subject is null or char_length(btrim(_subject)) not between 4 and 120 then
    raise exception 'Subject must be between 4 and 120 characters';
  end if;
  if _category not in ('order_status', 'listing_or_product', 'seller_communication', 'other') then
    raise exception 'Choose a valid support category';
  end if;
  if _message is null or char_length(btrim(_message)) not between 1 and 2000 then
    raise exception 'Message must be between 1 and 2000 characters';
  end if;

  select * into order_row
  from public.orders
  where id = _order_id and customer_id = auth.uid()
  for update;
  if not found then raise exception 'Order not found'; end if;

  if exists (
    select 1 from public.support_cases
    where order_id = order_row.id
      and status in ('open', 'in_progress', 'waiting_on_customer')
  ) then
    raise exception 'This order already has an open support case';
  end if;

  insert into public.support_cases (order_id, opened_by, subject, category)
  values (order_row.id, auth.uid(), btrim(_subject), _category)
  returning id into case_id;

  insert into public.support_case_messages (case_id, sender_id, body)
  values (case_id, auth.uid(), btrim(_message));
  insert into public.support_case_events (case_id, actor_id, status, note)
  values (case_id, auth.uid(), 'open', 'Support case opened');
  return case_id;
end;
$$;
revoke all on function public.create_order_support_case(uuid, text, text, text) from public, anon;
grant execute on function public.create_order_support_case(uuid, text, text, text) to authenticated;

create function public.reply_to_order_support_case(_case_id uuid, _body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  message_id uuid;
  case_row public.support_cases%rowtype;
  order_row public.orders%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if _body is null or char_length(btrim(_body)) not between 1 and 2000 then
    raise exception 'Reply must be between 1 and 2000 characters';
  end if;

  select * into case_row from public.support_cases where id = _case_id for update;
  if not found then raise exception 'Support case not found'; end if;
  select * into order_row from public.orders where id = case_row.order_id;
  if auth.uid() <> order_row.customer_id
    and auth.uid() is distinct from order_row.seller_id
    and not public.has_role(auth.uid(), 'admin') then
    raise exception 'Forbidden';
  end if;
  if case_row.status in ('resolved', 'closed') then
    raise exception 'This support case is closed';
  end if;

  insert into public.support_case_messages (case_id, sender_id, body)
  values (case_row.id, auth.uid(), btrim(_body))
  returning id into message_id;
  update public.support_cases set updated_at = now() where id = case_row.id;
  return message_id;
end;
$$;
revoke all on function public.reply_to_order_support_case(uuid, text) from public, anon;
grant execute on function public.reply_to_order_support_case(uuid, text) to authenticated;

create function public.admin_set_support_case_status(
  _case_id uuid,
  _status public.support_case_status,
  _note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  if _note is null or char_length(btrim(_note)) not between 1 and 500 then
    raise exception 'Provide a status note between 1 and 500 characters';
  end if;

  perform 1 from public.support_cases where id = _case_id for update;
  if not found then raise exception 'Support case not found'; end if;
  update public.support_cases set status = _status, updated_at = now() where id = _case_id;
  insert into public.support_case_events (case_id, actor_id, status, note)
  values (_case_id, auth.uid(), _status, btrim(_note));
end;
$$;
revoke all on function public.admin_set_support_case_status(uuid, public.support_case_status, text) from public, anon;
grant execute on function public.admin_set_support_case_status(uuid, public.support_case_status, text) to authenticated;
