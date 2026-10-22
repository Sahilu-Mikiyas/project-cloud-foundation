create table public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  order_event_id uuid not null references public.order_events(id) on delete cascade,
  title text not null check (length(title) between 1 and 120),
  body text not null check (length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (user_id, order_event_id)
);

create index user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at desc);

create index user_notifications_unread_idx
  on public.user_notifications (user_id, created_at desc)
  where read_at is null;

alter table public.user_notifications enable row level security;
grant select (id, user_id, order_id, order_event_id, title, body, created_at, read_at)
  on public.user_notifications to authenticated;
create policy "users read own notifications"
  on public.user_notifications for select to authenticated
  using (user_id = auth.uid());
revoke insert, update, delete on public.user_notifications from authenticated;
grant all on public.user_notifications to service_role;

create function public.create_order_event_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
  buyer_title text;
  buyer_body text;
  seller_title text;
  seller_body text;
begin
  select * into target_order
  from public.orders
  where id = new.order_id;

  if not found then
    return new;
  end if;

  if target_order.order_type = 'seller_listing'
    and new.actor_id = target_order.customer_id
    and new.status = 'awaiting_customer_deposit' then
    seller_title := 'New seller preorder';
    seller_body := format(
      'A buyer placed preorder %s. Review it in your seller portal.',
      target_order.reference
    );
  else
    seller_title := 'Seller preorder update';
    seller_body := format(
      'Preorder %s status is now %s.',
      target_order.reference,
      replace(new.status::text, '_', ' ')
    );
  end if;

  if target_order.order_type = 'seller_listing'
    and target_order.seller_response = 'accepted'
    and new.status not in ('cancelled', 'expired') then
    buyer_title := 'Seller confirmed availability';
    buyer_body := format(
      'The seller confirmed preorder %s. The deposit is still pending.',
      target_order.reference
    );
  elsif target_order.order_type = 'seller_listing'
    and target_order.seller_response = 'declined' then
    buyer_title := 'Seller declined the preorder';
    buyer_body := format(
      'Preorder %s was cancelled before any deposit was collected.',
      target_order.reference
    );
  else
    buyer_title := 'Order update';
    buyer_body := format(
      'Order %s status is now %s.',
      target_order.reference,
      replace(new.status::text, '_', ' ')
    );
  end if;

  if target_order.customer_id is distinct from new.actor_id then
    insert into public.user_notifications (
      user_id, order_id, order_event_id, title, body
    ) values (
      target_order.customer_id, target_order.id, new.id, buyer_title, buyer_body
    ) on conflict (user_id, order_event_id) do nothing;
  end if;

  if target_order.order_type = 'seller_listing'
    and target_order.seller_id is not null
    and target_order.seller_id is distinct from new.actor_id then
    insert into public.user_notifications (
      user_id, order_id, order_event_id, title, body
    ) values (
      target_order.seller_id, target_order.id, new.id, seller_title, seller_body
    ) on conflict (user_id, order_event_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger order_events_create_notifications
after insert on public.order_events
for each row execute function public.create_order_event_notifications();

revoke all on function public.create_order_event_notifications() from public, anon, authenticated;

create function public.mark_notification_read(_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;

  update public.user_notifications
  set read_at = coalesce(read_at, now())
  where id = _notification_id and user_id = auth.uid();
end;
$$;

revoke all on function public.mark_notification_read(uuid) from public, anon;
grant execute on function public.mark_notification_read(uuid) to authenticated;
