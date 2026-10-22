alter table public.orders
  add column seller_response text,
  add column seller_responded_at timestamptz;

update public.orders
set seller_response = 'pending'
where order_type = 'seller_listing';

create function public.default_seller_order_response()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.order_type = 'seller_listing' and new.seller_response is null then
    new.seller_response := 'pending';
  elsif new.order_type = 'sourcing' then
    new.seller_response := null;
    new.seller_responded_at := null;
  end if;
  return new;
end;
$$;

create trigger orders_default_seller_response
before insert on public.orders
for each row execute function public.default_seller_order_response();

alter table public.orders
  add constraint orders_seller_response_check
  check (
    (order_type = 'sourcing' and seller_response is null and seller_responded_at is null)
    or
    (order_type = 'seller_listing'
      and seller_response in ('pending', 'accepted', 'declined')
      and ((seller_response = 'pending' and seller_responded_at is null)
        or (seller_response in ('accepted', 'declined') and seller_responded_at is not null)))
  );

grant select (seller_response, seller_responded_at)
  on public.orders to authenticated;

create or replace function public.seller_respond_to_order(
  _order_id uuid,
  _response text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
  next_status public.order_status;
  event_note text;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;

  if _response not in ('accepted', 'declined') then
    raise exception 'Response must be accepted or declined';
  end if;

  select * into target_order
  from public.orders
  where id = _order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if target_order.order_type <> 'seller_listing'
    or target_order.seller_id <> auth.uid() then
    raise exception 'Forbidden';
  end if;

  if not public.is_verified_seller(auth.uid()) then
    raise exception 'Verified seller access required';
  end if;

  if target_order.seller_response = _response then
    return;
  end if;

  if target_order.seller_response <> 'pending'
    or target_order.status <> 'awaiting_customer_deposit' then
    raise exception 'This preorder can no longer be changed';
  end if;

  if _response = 'declined' then
    next_status := 'cancelled';
    event_note := 'Seller declined the preorder; it was cancelled. No deposit was collected.';
  else
    next_status := target_order.status;
    event_note := 'Seller accepted the preorder availability. Deposit is still pending; fulfillment has not started.';
  end if;

  update public.orders
  set seller_response = _response,
      seller_responded_at = now(),
      status = next_status,
      updated_at = now()
  where id = _order_id;

  insert into public.order_events (order_id, status, note, actor_id)
  values (_order_id, next_status, event_note, auth.uid());
end;
$$;

revoke all on function public.seller_respond_to_order(uuid, text) from public, anon;
grant execute on function public.seller_respond_to_order(uuid, text) to authenticated;
