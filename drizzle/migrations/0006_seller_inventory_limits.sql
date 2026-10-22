alter table public.product_variants
  add column inventory_limit integer,
  add column inventory_committed integer not null default 0;

update public.product_variants pv
set inventory_committed = coalesce((
  select sum(oi.quantity)::integer
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.variant_id = pv.id
    and o.order_type = 'seller_listing'
    and o.status not in ('cancelled', 'expired')
), 0)
where exists (
  select 1 from public.products p
  where p.id = pv.product_id and p.listing_type = 'seller'
);

alter table public.product_variants
  add constraint product_variant_inventory_limit_check
    check (inventory_limit is null or inventory_limit >= 0),
  add constraint product_variant_inventory_committed_check
    check (inventory_committed >= 0 and
      (inventory_limit is null or inventory_committed <= inventory_limit));

-- Keep the inventory counter database-owned. Sellers may change the optional
-- capacity limit but cannot forge the number of reserved/committed units.
revoke select on public.product_variants from anon, authenticated;
grant select (
  id, product_id, label, price_delta_etb_cents, is_available, sort_order,
  inventory_limit, inventory_committed
) on public.product_variants to anon, authenticated;
revoke insert, update, delete on public.product_variants from authenticated;
grant insert (product_id, label, price_delta_etb_cents, is_available, sort_order)
  on public.product_variants to authenticated;
grant update (label, price_delta_etb_cents, is_available, sort_order, inventory_limit)
  on public.product_variants to authenticated;

create or replace function public.release_seller_inventory_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
begin
  if old.order_type <> 'seller_listing' then
    return new;
  end if;

  if old.status in ('cancelled', 'expired')
    and new.status not in ('cancelled', 'expired') then
    raise exception 'Cancelled or expired seller orders cannot be reopened';
  end if;

  if old.status not in ('cancelled', 'expired', 'delivered')
    and new.status in ('cancelled', 'expired') then
    for item in
      select variant_id, quantity
      from public.order_items
      where order_id = old.id and variant_id is not null
      order by variant_id
    loop
      update public.product_variants
      set inventory_committed = inventory_committed - item.quantity
      where id = item.variant_id
        and inventory_committed >= item.quantity;

      if not found then
        raise exception 'Inventory reservation could not be released safely';
      end if;
    end loop;
  end if;

  return new;
end;
$$;

create trigger orders_release_seller_inventory
after update of status on public.orders
for each row
when (old.status is distinct from new.status)
execute function public.release_seller_inventory_on_cancel();

revoke all on function public.release_seller_inventory_on_cancel() from public, anon, authenticated;

create or replace function public.reserve_seller_order(
  _variant_id uuid,
  _quantity integer,
  _request_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;
  unit_price bigint;
  subtotal bigint;
  deposit bigint;
  order_id uuid;
  request_fingerprint text;
  prior_fingerprint text;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if _request_key is null then raise exception 'An idempotency key is required'; end if;
  if _variant_id is null or _quantity is null or _quantity < 1 or _quantity > 10 then
    raise exception 'A product option and quantity between 1 and 10 are required';
  end if;

  request_fingerprint := md5('seller:' || _variant_id::text || ':' || _quantity::text);
  select id, request_hash into order_id, prior_fingerprint
  from public.orders
  where customer_id = auth.uid() and idempotency_key = _request_key;
  if found then
    if prior_fingerprint <> request_fingerprint then
      raise exception 'Idempotency key was already used for a different order request';
    end if;
    return order_id;
  end if;

  -- Lock the option so concurrent buyers cannot exceed the configured cap.
  select pv.id, pv.label, pv.price_delta_etb_cents, pv.is_available,
         pv.inventory_limit, pv.inventory_committed,
         p.id as product_id, p.name, p.image_url, p.price_etb_cents,
         p.deposit_percent, p.is_published, p.listing_type, p.seller_user_id
  into v
  from public.product_variants pv
  join public.products p on p.id = pv.product_id
  where pv.id = _variant_id
  for update of pv, p;

  if not found then raise exception 'This seller listing is not available for preorder'; end if;
  if not v.is_available or not v.is_published or v.listing_type <> 'seller'
    or v.seller_user_id is null or v.seller_user_id = auth.uid()
    or not public.is_verified_seller(v.seller_user_id) then
    raise exception 'This seller listing is not available for preorder';
  end if;

  unit_price := (v.price_etb_cents::numeric + v.price_delta_etb_cents::numeric)::bigint;
  if unit_price <= 0 then raise exception 'Product price must be greater than zero'; end if;
  subtotal := (unit_price::numeric * _quantity)::bigint;
  deposit := ((subtotal::numeric * v.deposit_percent) / 100)::bigint;
  if deposit < 1 then raise exception 'Calculated deposit must be greater than zero'; end if;

  insert into public.orders (
    customer_id, order_type, seller_id, subtotal_etb_cents, deposit_etb_cents,
    idempotency_key, request_hash
  ) values (
    auth.uid(), 'seller_listing', v.seller_user_id, subtotal, deposit,
    _request_key, request_fingerprint
  )
  on conflict (customer_id, idempotency_key)
    where idempotency_key is not null do nothing
  returning id into order_id;

  if order_id is null then
    select id, request_hash into order_id, prior_fingerprint
    from public.orders
    where customer_id = auth.uid() and idempotency_key = _request_key;
    if prior_fingerprint <> request_fingerprint then
      raise exception 'Idempotency key was already used for a different order request';
    end if;
    return order_id;
  end if;

  if v.inventory_limit is not null
    and v.inventory_committed + _quantity > v.inventory_limit then
    raise exception 'This option no longer has enough preorder capacity';
  end if;

  update public.product_variants
  set inventory_committed = inventory_committed + _quantity
  where id = v.id;

  insert into public.order_items (
    order_id, product_id, variant_id, product_name, variant_label,
    image_url, unit_price_etb_cents, quantity
  ) values (
    order_id, v.product_id, v.id, v.name, v.label,
    v.image_url, unit_price, _quantity
  );

  insert into public.order_events (order_id, status, note, actor_id)
  values (order_id, 'awaiting_customer_deposit', 'Seller preorder created; deposit payment is pending', auth.uid());

  return order_id;
end;
$$;

revoke all on function public.reserve_seller_order(uuid, integer, uuid) from public, anon;
grant execute on function public.reserve_seller_order(uuid, integer, uuid) to authenticated;
