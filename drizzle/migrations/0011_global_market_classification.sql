-- Keep seller listings and Shanta-sourced products in their existing channels,
-- while recording where each offer is based or sourced from.
alter table public.products
  add column market_region text not null default 'africa',
  add column market_country text not null default 'Ethiopia',
  add column market_city text;

alter table public.products
  add constraint products_market_region_check check (market_region in (
    'africa', 'asia', 'europe', 'middle_east', 'north_america',
    'central_america_caribbean', 'south_america', 'oceania'
  )),
  add constraint products_market_country_check check (
    char_length(btrim(market_country)) between 2 and 80
  ),
  add constraint products_market_city_check check (
    market_city is null or char_length(btrim(market_city)) between 2 and 80
  );

-- Preserve the known origin of the existing sourcing catalog. Seller listings
-- keep the safe Ethiopia default until the seller chooses their actual market.
update public.products
set market_region = 'middle_east',
    market_country = 'United Arab Emirates',
    market_city = 'Dubai'
where listing_type = 'sourcing';

create index products_market_region_country_idx
  on public.products (market_region, market_country, listing_type)
  where is_published;

-- The original listing RPC remains available for already-deployed app versions.
-- New clients use this explicit market-aware RPC so product + options are still
-- created atomically and seller verification remains enforced in the database.
create function public.create_seller_listing_with_market(
  _name text,
  _slug text,
  _brand text,
  _description text,
  _image_url text,
  _price_etb_cents bigint,
  _deposit_percent integer,
  _delivery_days integer,
  _category_id uuid,
  _variant_labels text[],
  _market_region text,
  _market_country text,
  _market_city text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;

  if not exists (
    select 1 from public.seller_profiles
    where user_id = auth.uid() and status = 'verified'
  ) then
    raise exception 'A verified seller account is required';
  end if;

  if length(trim(coalesce(_name, ''))) not between 2 and 160 then
    raise exception 'Product name must be between 2 and 160 characters';
  end if;
  if _slug is null or _slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Product URL slug is invalid';
  end if;
  if _price_etb_cents is null or _price_etb_cents <= 0 then
    raise exception 'Price must be greater than zero';
  end if;
  if _deposit_percent is null or _deposit_percent not between 1 and 100 then
    raise exception 'Deposit percentage must be between 1 and 100';
  end if;
  if _delivery_days is null or _delivery_days not between 1 and 365 then
    raise exception 'Delivery estimate must be between 1 and 365 days';
  end if;
  if coalesce(cardinality(_variant_labels), 0) not between 1 and 20 then
    raise exception 'Provide between 1 and 20 product options';
  end if;
  if exists (
    select 1 from unnest(_variant_labels) as labels(label)
    where length(trim(coalesce(label, ''))) not between 1 and 80
  ) then
    raise exception 'Each product option must be between 1 and 80 characters';
  end if;
  if _market_region not in (
    'africa', 'asia', 'europe', 'middle_east', 'north_america',
    'central_america_caribbean', 'south_america', 'oceania'
  ) then
    raise exception 'Choose a valid market region';
  end if;
  if _market_country is null or char_length(btrim(_market_country)) not between 2 and 80 then
    raise exception 'Enter a country between 2 and 80 characters';
  end if;
  if _market_city is not null and char_length(btrim(_market_city)) not between 2 and 80 then
    raise exception 'Enter a city between 2 and 80 characters';
  end if;

  insert into public.products (
    seller_user_id, listing_type, slug, name, brand, description, image_url,
    price_etb_cents, deposit_percent, delivery_days, category_id, is_published,
    market_region, market_country, market_city
  ) values (
    auth.uid(), 'seller', _slug, trim(_name), nullif(trim(_brand), ''),
    nullif(trim(_description), ''), nullif(trim(_image_url), ''),
    _price_etb_cents, _deposit_percent, _delivery_days, _category_id, false,
    _market_region, btrim(_market_country), nullif(btrim(_market_city), '')
  ) returning id into listing_id;

  insert into public.product_variants (product_id, label, sort_order)
  select listing_id, trim(label), ordinal::integer
  from unnest(_variant_labels) with ordinality as labels(label, ordinal);

  return listing_id;
end;
$$;

revoke all on function public.create_seller_listing_with_market(
  text, text, text, text, text, bigint, integer, integer, uuid, text[], text, text, text
) from public, anon;
grant execute on function public.create_seller_listing_with_market(
  text, text, text, text, text, bigint, integer, integer, uuid, text[], text, text, text
) to authenticated;

-- Snapshot each order's market at creation so later listing edits never rewrite
-- the location attached to a buyer's existing order.
alter table public.orders
  add column market_region text not null default 'middle_east',
  add column market_country text not null default 'United Arab Emirates',
  add column market_city text default 'Dubai';

alter table public.orders
  add constraint orders_market_region_check check (market_region in (
    'africa', 'asia', 'europe', 'middle_east', 'north_america',
    'central_america_caribbean', 'south_america', 'oceania'
  )),
  add constraint orders_market_country_check check (
    char_length(btrim(market_country)) between 2 and 80
  ),
  add constraint orders_market_city_check check (
    market_city is null or char_length(btrim(market_city)) between 2 and 80
  );

update public.orders o
set market_region = p.market_region,
    market_country = p.market_country,
    market_city = p.market_city
from public.order_items oi
join public.products p on p.id = oi.product_id
where oi.order_id = o.id;

-- Sourcing partners declare the market they can cover. Existing partners stay
-- attached to the established Dubai market until their profile is updated.
alter table public.suppliers
  add column market_region text not null default 'middle_east',
  add column market_country text not null default 'United Arab Emirates';

alter table public.suppliers
  add constraint suppliers_market_region_check check (market_region in (
    'africa', 'asia', 'europe', 'middle_east', 'north_america',
    'central_america_caribbean', 'south_america', 'oceania'
  )),
  add constraint suppliers_market_country_check check (
    char_length(btrim(market_country)) between 2 and 80
  );

create or replace function public.set_order_market_from_product()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders o
  set market_region = p.market_region,
      market_country = p.market_country,
      market_city = p.market_city
  from public.products p
  where o.id = new.order_id and p.id = new.product_id;
  return new;
end;
$$;
revoke all on function public.set_order_market_from_product() from public, anon, authenticated;
create trigger set_order_market_after_item_insert
after insert on public.order_items
for each row execute function public.set_order_market_from_product();

-- Suppliers can only see open sourcing orders from their declared market.
drop policy "orders own or operational read" on public.orders;
create policy "orders own or operational read"
  on public.orders for select to authenticated
  using (
    customer_id = auth.uid()
    or public.has_role(auth.uid(), 'admin')
    or (
      order_type = 'sourcing'
      and status = 'open_for_assignment'
      and public.has_role(auth.uid(), 'supplier')
      and exists (
        select 1 from public.suppliers s
        where s.user_id = auth.uid()
          and s.status = 'verified'
          and s.market_region = orders.market_region
          and lower(s.market_country) = lower(orders.market_country)
      )
    )
    or seller_id = auth.uid()
  );

grant select (market_region, market_country, market_city) on public.orders to authenticated;