-- Add a broad, clearly marked catalog preview without presenting sample items
-- as live offers. Sample rows are browseable, but the reservation RPC rejects them.
alter table public.products
  add column is_catalog_sample boolean not null default false;

alter table public.products
  add constraint products_catalog_sample_channel_check
  check (not is_catalog_sample or listing_type = 'sourcing');

insert into public.categories (slug, name, sort_order) values
  ('home-living', 'Home & Living', 5),
  ('beauty-personal-care', 'Beauty & Personal Care', 6),
  ('kitchen-dining', 'Kitchen & Dining', 7),
  ('footwear', 'Footwear', 8),
  ('bags-accessories', 'Bags & Accessories', 9),
  ('sports-outdoors', 'Sports & Outdoors', 10),
  ('kids-toys', 'Kids & Toys', 11),
  ('gifts-stationery', 'Gifts & Stationery', 12)
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;

insert into public.products (
  slug, name, brand, description, category_id, image_url, price_etb_cents,
  deposit_percent, delivery_days, is_published, listing_type, market_region,
  market_country, market_city, is_catalog_sample
) values
  ('sample-jaipur-block-print-cushion-covers', 'Jaipur Block-Print Cushion Covers', null,
   'Illustrative catalog preview inspired by Indian block-print textiles. This is not a live offer; the displayed price and delivery estimate are examples.',
   (select id from public.categories where slug = 'home-living'), null, 185000, 0, 18, true, 'sourcing', 'asia', 'India', 'Jaipur', true),
  ('sample-grasse-botanical-care-set', 'Grasse Botanical Care Set', null,
   'Illustrative catalog preview of a botanical personal-care set. This is not a live offer; the displayed price and delivery estimate are examples.',
   (select id from public.categories where slug = 'beauty-personal-care'), null, 425000, 0, 16, true, 'sourcing', 'europe', 'France', 'Grasse', true),
  ('sample-kyoto-ceramic-tea-set', 'Kyoto Ceramic Tea Set', null,
   'Illustrative catalog preview inspired by Japanese ceramic tableware. This is not a live offer; the displayed price and delivery estimate are examples.',
   (select id from public.categories where slug = 'kitchen-dining'), null, 680000, 0, 20, true, 'sourcing', 'asia', 'Japan', 'Kyoto', true),
  ('sample-florence-leather-loafers', 'Florence Leather Loafers', null,
   'Illustrative catalog preview of classic leather loafers. This is not a live offer; the displayed price and delivery estimate are examples.',
   (select id from public.categories where slug = 'footwear'), null, 1120000, 0, 21, true, 'sourcing', 'europe', 'Italy', 'Florence', true),
  ('sample-istanbul-woven-market-tote', 'Istanbul Woven Market Tote', null,
   'Illustrative catalog preview inspired by woven accessories from Istanbul. This is not a live offer; the displayed price and delivery estimate are examples.',
   (select id from public.categories where slug = 'bags-accessories'), null, 295000, 0, 17, true, 'sourcing', 'middle_east', 'Türkiye', 'Istanbul', true),
  ('sample-nairobi-sisal-storage-basket', 'Nairobi Sisal Storage Basket', null,
   'Illustrative catalog preview of a handwoven natural-fiber storage basket. This is not a live offer; the displayed price and delivery estimate are examples.',
   (select id from public.categories where slug = 'home-living'), null, 340000, 0, 14, true, 'sourcing', 'africa', 'Kenya', 'Nairobi', true),
  ('sample-alpine-insulated-travel-bottle', 'Alpine Insulated Travel Bottle', null,
   'Illustrative catalog preview of a reusable insulated bottle for travel and outdoor use. This is not a live offer; the displayed price and delivery estimate are examples.',
   (select id from public.categories where slug = 'sports-outdoors'), null, 265000, 0, 19, true, 'sourcing', 'europe', 'Germany', 'Munich', true),
  ('sample-berlin-wooden-building-set', 'Berlin Wooden Building Set', null,
   'Illustrative catalog preview of a wooden construction toy. This is not a live offer; the displayed price and delivery estimate are examples.',
   (select id from public.categories where slug = 'kids-toys'), null, 510000, 0, 19, true, 'sourcing', 'europe', 'Germany', 'Berlin', true),
  ('sample-london-journal-gift-set', 'London Journal Gift Set', null,
   'Illustrative catalog preview of a paper journal and writing set. This is not a live offer; the displayed price and delivery estimate are examples.',
   (select id from public.categories where slug = 'gifts-stationery'), null, 215000, 0, 17, true, 'sourcing', 'europe', 'United Kingdom', 'London', true)
on conflict (slug) do update set
  name = excluded.name,
  brand = excluded.brand,
  description = excluded.description,
  category_id = excluded.category_id,
  price_etb_cents = excluded.price_etb_cents,
  deposit_percent = excluded.deposit_percent,
  delivery_days = excluded.delivery_days,
  is_published = excluded.is_published,
  listing_type = excluded.listing_type,
  market_region = excluded.market_region,
  market_country = excluded.market_country,
  market_city = excluded.market_city,
  is_catalog_sample = excluded.is_catalog_sample;

insert into public.product_variants (product_id, label, price_delta_etb_cents, sort_order)
select p.id, 'Sample option', 0, 1
from public.products p
where p.slug like 'sample-%'
  and not exists (
    select 1 from public.product_variants pv
    where pv.product_id = p.id and pv.label = 'Sample option'
  );

create or replace function public.reserve_sourcing_order(
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

  request_fingerprint := md5('sourcing:' || _variant_id::text || ':' || _quantity::text);
  insert into public.orders (customer_id, order_type, subtotal_etb_cents, deposit_etb_cents, idempotency_key, request_hash)
  values (auth.uid(), 'sourcing', 0, 0, _request_key, request_fingerprint)
  on conflict (customer_id, idempotency_key) where idempotency_key is not null do nothing
  returning id into order_id;

  if order_id is null then
    select id, request_hash into order_id, prior_fingerprint
    from public.orders where customer_id = auth.uid() and idempotency_key = _request_key;
    if prior_fingerprint <> request_fingerprint then
      raise exception 'Idempotency key was already used for a different order request';
    end if;
    return order_id;
  end if;

  select pv.id, pv.label, pv.price_delta_etb_cents, pv.is_available,
         p.id as product_id, p.name, p.image_url, p.price_etb_cents,
         p.deposit_percent, p.is_published, p.listing_type, p.is_catalog_sample
  into v
  from public.product_variants pv
  join public.products p on p.id = pv.product_id
  where pv.id = _variant_id
  for share of pv, p;

  if not found or not v.is_available or not v.is_published
    or v.listing_type <> 'sourcing' or v.is_catalog_sample then
    raise exception 'This sourcing item is not available';
  end if;

  unit_price := (v.price_etb_cents::numeric + v.price_delta_etb_cents::numeric)::bigint;
  if unit_price <= 0 then raise exception 'Product price must be greater than zero'; end if;
  subtotal := (unit_price::numeric * _quantity)::bigint;
  deposit := ((subtotal::numeric * v.deposit_percent) / 100)::bigint;
  update public.orders set subtotal_etb_cents = subtotal, deposit_etb_cents = deposit, updated_at = now()
  where id = order_id;
  insert into public.order_items (
    order_id, product_id, variant_id, product_name, variant_label,
    image_url, unit_price_etb_cents, quantity
  ) values (order_id, v.product_id, v.id, v.name, v.label, v.image_url, unit_price, _quantity);
  insert into public.order_events (order_id, status, note, actor_id)
  values (order_id, 'awaiting_customer_deposit', 'Sourcing reservation created; deposit payment is pending', auth.uid());
  return order_id;
end;
$$;

revoke all on function public.reserve_sourcing_order(uuid, integer, uuid) from public, anon;
grant execute on function public.reserve_sourcing_order(uuid, integer, uuid) to authenticated;
