alter type public.order_status add value if not exists 'confirmed';
alter type public.order_status add value if not exists 'seller_preparing';
alter type public.order_status add value if not exists 'seller_in_delivery';
alter table public.orders  add column order_type text not null default 'sourcing',  add column seller_id uuid references auth.users(id) on delete set null,  add column idempotency_key uuid,  add column request_hash text;
alter table public.orders  add constraint orders_order_type_check    check (order_type in ('sourcing', 'seller_listing')),  add constraint orders_order_seller_check    check ((order_type = 'sourcing' and seller_id is null)        or (order_type = 'seller_listing' and seller_id is not null)),  add constraint orders_request_hash_check    check ((idempotency_key is null and request_hash is null)        or (idempotency_key is not null and request_hash is not null));
create unique index orders_customer_idempotency_key_unique  on public.orders (customer_id, idempotency_key)  where idempotency_key is not null;
drop policy "orders own read" on public.orders;
create policy "orders own or operational read"  on public.orders for select to authenticated  using (    customer_id = auth.uid()    or public.has_role(auth.uid(), 'admin')    or (public.has_role(auth.uid(), 'supplier') and order_type = 'sourcing' and status = 'open_for_assignment')    or seller_id = auth.uid()  );
revoke select on public.orders from authenticated;
grant select (  id, reference, order_type, seller_id, status,  subtotal_etb_cents, deposit_etb_cents, created_at, updated_at) on public.orders to authenticated;
create or replace function public.admin_set_order_status(  _order_id uuid,  _status public.order_status,  _note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
begin  if not public.has_role(auth.uid(), 'admin') then    raise exception 'Forbidden';
  end if;
  perform 1 from public.orders  where id = _order_id  for update;
  if not found then    raise exception 'Order not found';
  end if;
  if _status not in ('awaiting_customer_deposit', 'cancelled', 'expired', 'disputed') then    raise exception 'Payment and fulfillment statuses require their authorized workflow';
  end if;
  update public.orders  set status = _status, updated_at = now()  where id = _order_id;
  insert into public.order_events (order_id, status, note, actor_id)  values (_order_id, _status, _note, auth.uid());
end;
$$;
revoke all on function public.admin_set_order_status(uuid, public.order_status, text) from public, anon;
grant execute on function public.admin_set_order_status(uuid, public.order_status, text) to authenticated;
create or replace function public.reserve_sourcing_order(  _variant_id uuid,  _quantity integer,  _request_key uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare  v record;
  unit_price bigint;
  subtotal bigint;
  deposit bigint;
  order_id uuid;
  request_fingerprint text;
  prior_fingerprint text;
begin  if auth.uid() is null then raise exception 'Sign in required';
 end if;
  if _request_key is null then raise exception 'An idempotency key is required';
 end if;
  if _variant_id is null or _quantity is null or _quantity < 1 or _quantity > 10 then    raise exception 'A product option and quantity between 1 and 10 are required';
  end if;
  request_fingerprint := md5('sourcing:' || _variant_id::text || ':' || _quantity::text);
  insert into public.orders (customer_id, order_type, subtotal_etb_cents, deposit_etb_cents, idempotency_key, request_hash)  values (auth.uid(), 'sourcing', 0, 0, _request_key, request_fingerprint)  on conflict (customer_id, idempotency_key) where idempotency_key is not null do nothing  returning id into order_id;
  if order_id is null then    select id, request_hash into order_id, prior_fingerprint    from public.orders    where customer_id = auth.uid() and idempotency_key = _request_key;
    if prior_fingerprint <> request_fingerprint then      raise exception 'Idempotency key was already used for a different order request';
    end if;
    return order_id;
  end if;
  select pv.id, pv.label, pv.price_delta_etb_cents, pv.is_available,         p.id as product_id, p.name, p.image_url, p.price_etb_cents,         p.deposit_percent, p.is_published, p.listing_type  into v  from public.product_variants pv  join public.products p on p.id = pv.product_id  where pv.id = _variant_id  for share of pv, p;
  if not found then    raise exception 'This sourcing item is not available';
  end if;
  if not v.is_available or not v.is_published or v.listing_type <> 'sourcing' then    raise exception 'This sourcing item is not available';
  end if;
  unit_price := (v.price_etb_cents::numeric + v.price_delta_etb_cents::numeric)::bigint;
  if unit_price <= 0 then raise exception 'Product price must be greater than zero';
 end if;
  subtotal := (unit_price::numeric * _quantity)::bigint;
  deposit := ((subtotal::numeric * v.deposit_percent) / 100)::bigint;
  update public.orders  set subtotal_etb_cents = subtotal,      deposit_etb_cents = deposit,      updated_at = now()  where id = order_id;
  insert into public.order_items (    order_id, product_id, variant_id, product_name, variant_label,    image_url, unit_price_etb_cents, quantity  ) values (    order_id, v.product_id, v.id, v.name, v.label,    v.image_url, unit_price, _quantity  );
  insert into public.order_events (order_id, status, note, actor_id)  values (order_id, 'awaiting_customer_deposit', 'Sourcing reservation created;
 deposit payment is pending', auth.uid());
  return order_id;
end;
$$;
revoke all on function public.reserve_sourcing_order(uuid, integer, uuid) from public, anon;
grant execute on function public.reserve_sourcing_order(uuid, integer, uuid) to authenticated;
create or replace function public.reserve_seller_order(  _variant_id uuid,  _quantity integer,  _request_key uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare  v record;
  unit_price bigint;
  subtotal bigint;
  deposit bigint;
  order_id uuid;
  request_fingerprint text;
  prior_fingerprint text;
begin  if auth.uid() is null then raise exception 'Sign in required';
 end if;
  if _request_key is null then raise exception 'An idempotency key is required';
 end if;
  if _variant_id is null or _quantity is null or _quantity < 1 or _quantity > 10 then    raise exception 'A product option and quantity between 1 and 10 are required';
  end if;
  request_fingerprint := md5('seller:' || _variant_id::text || ':' || _quantity::text);
  select id, request_hash into order_id, prior_fingerprint  from public.orders  where customer_id = auth.uid() and idempotency_key = _request_key;
  if found then    if prior_fingerprint <> request_fingerprint then      raise exception 'Idempotency key was already used for a different order request';
    end if;
    return order_id;
  end if;
  select pv.id, pv.label, pv.price_delta_etb_cents, pv.is_available,         p.id as product_id, p.name, p.image_url, p.price_etb_cents,         p.deposit_percent, p.is_published, p.listing_type, p.seller_user_id  into v  from public.product_variants pv  join public.products p on p.id = pv.product_id  where pv.id = _variant_id  for share of pv, p;
  if not found then    raise exception 'This seller listing is not available for preorder';
  end if;
  if not v.is_available     or not v.is_published     or v.listing_type <> 'seller'     or v.seller_user_id is null     or v.seller_user_id = auth.uid()     or not public.is_verified_seller(v.seller_user_id) then    raise exception 'This seller listing is not available for preorder';
  end if;
  unit_price := (v.price_etb_cents::numeric + v.price_delta_etb_cents::numeric)::bigint;
  if unit_price <= 0 then raise exception 'Product price must be greater than zero';
 end if;
  subtotal := (unit_price::numeric * _quantity)::bigint;
  deposit := ((subtotal::numeric * v.deposit_percent) / 100)::bigint;
  if deposit < 1 then raise exception 'Calculated deposit must be greater than zero';
 end if;
  insert into public.orders (    customer_id, order_type, seller_id, subtotal_etb_cents, deposit_etb_cents,    idempotency_key, request_hash  ) values (    auth.uid(), 'seller_listing', v.seller_user_id, subtotal, deposit,    _request_key, request_fingerprint  )  on conflict (customer_id, idempotency_key) where idempotency_key is not null do nothing  returning id into order_id;
  if order_id is null then    select id, request_hash into order_id, prior_fingerprint    from public.orders    where customer_id = auth.uid() and idempotency_key = _request_key;
    if prior_fingerprint <> request_fingerprint then      raise exception 'Idempotency key was already used for a different order request';
    end if;
    return order_id;
  end if;
  insert into public.order_items (    order_id, product_id, variant_id, product_name, variant_label,    image_url, unit_price_etb_cents, quantity  ) values (    order_id, v.product_id, v.id, v.name, v.label,    v.image_url, unit_price, _quantity  );
  insert into public.order_events (order_id, status, note, actor_id)  values (order_id, 'awaiting_customer_deposit', 'Seller preorder created;
 deposit payment is pending', auth.uid());
  return order_id;
end;
$$;
revoke all on function public.reserve_seller_order(uuid, integer, uuid) from public, anon;
grant execute on function public.reserve_seller_order(uuid, integer, uuid) to authenticated;
create or replace function public.reserve_order(_variant_id uuid, _quantity integer)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.reserve_sourcing_order(_variant_id, _quantity, gen_random_uuid());
end;
$$;
revoke all on function public.reserve_order(uuid, integer) from public, anon;
grant execute on function public.reserve_order(uuid, integer) to authenticated;
