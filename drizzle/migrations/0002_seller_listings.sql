create type public.seller_status as enum ('pending', 'verified', 'rejected', 'suspended');

create table public.seller_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  business_name text not null check (length(trim(business_name)) between 2 and 120),
  phone text,
  description text,
  status public.seller_status not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

grant select on public.seller_profiles to authenticated;
grant insert (user_id, business_name, phone, description) on public.seller_profiles to authenticated;
grant all on public.seller_profiles to service_role;
alter table public.seller_profiles enable row level security;

create policy "seller profile own or admin read"
  on public.seller_profiles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "seller application own pending insert"
  on public.seller_profiles for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

create or replace function public.is_verified_seller(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.seller_profiles
    where user_id = _user_id and status = 'verified'
  );
$$;

revoke all on function public.is_verified_seller(uuid) from public;
grant execute on function public.is_verified_seller(uuid) to anon, authenticated, service_role;

alter table public.products
  add column seller_user_id uuid references auth.users(id) on delete cascade,
  add column listing_type text not null default 'sourcing';

alter table public.products
  add constraint products_listing_type_check
    check (listing_type in ('sourcing', 'seller')),
  add constraint products_listing_owner_check
    check ((listing_type = 'sourcing' and seller_user_id is null)
        or (listing_type = 'seller' and seller_user_id is not null)),
  add constraint products_seller_listing_terms_check
    check (listing_type = 'sourcing' or (
      length(trim(name)) between 2 and 160
      and length(coalesce(brand, '')) <= 120
      and length(coalesce(description, '')) <= 3000
      and length(coalesce(image_url, '')) <= 2048
      and price_etb_cents > 0
      and deposit_percent between 1 and 100
      and delivery_days between 1 and 365
    ));

drop policy "products public read" on public.products;
create policy "products public read"
  on public.products for select to anon, authenticated
  using (
    (is_published and (
      listing_type = 'sourcing'
      or public.is_verified_seller(seller_user_id)
    ))
    or public.has_role(auth.uid(), 'admin')
  );

create policy "verified sellers manage own listings"
  on public.products for all to authenticated
  using (
    seller_user_id = auth.uid()
    and listing_type = 'seller'
    and exists (
      select 1 from public.seller_profiles sp
      where sp.user_id = auth.uid() and sp.status = 'verified'
    )
  )
  with check (
    seller_user_id = auth.uid()
    and listing_type = 'seller'
    and exists (
      select 1 from public.seller_profiles sp
      where sp.user_id = auth.uid() and sp.status = 'verified'
    )
  );

create policy "verified sellers manage own listing variants"
  on public.product_variants for all to authenticated
  using (
    exists (
      select 1 from public.products p
      join public.seller_profiles sp on sp.user_id = p.seller_user_id
      where p.id = product_id
        and p.listing_type = 'seller'
        and p.seller_user_id = auth.uid()
        and sp.status = 'verified'
    )
  )
  with check (
    exists (
      select 1 from public.products p
      join public.seller_profiles sp on sp.user_id = p.seller_user_id
      where p.id = product_id
        and p.listing_type = 'seller'
        and p.seller_user_id = auth.uid()
        and sp.status = 'verified'
    )
  );

create or replace function public.create_seller_listing(
  _name text,
  _slug text,
  _brand text,
  _description text,
  _image_url text,
  _price_etb_cents bigint,
  _deposit_percent integer,
  _delivery_days integer,
  _category_id uuid,
  _variant_labels text[]
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

  insert into public.products (
    seller_user_id, listing_type, slug, name, brand, description, image_url,
    price_etb_cents, deposit_percent, delivery_days, category_id, is_published
  ) values (
    auth.uid(), 'seller', _slug, trim(_name), nullif(trim(_brand), ''),
    nullif(trim(_description), ''), nullif(trim(_image_url), ''),
    _price_etb_cents, _deposit_percent, _delivery_days, _category_id, false
  ) returning id into listing_id;

  insert into public.product_variants (product_id, label, sort_order)
  select listing_id, trim(label), ordinal::integer
  from unnest(_variant_labels) with ordinality as labels(label, ordinal);

  return listing_id;
end;
$$;

revoke all on function public.create_seller_listing(text, text, text, text, text, bigint, integer, integer, uuid, text[]) from public, anon;
grant execute on function public.create_seller_listing(text, text, text, text, text, bigint, integer, integer, uuid, text[]) to authenticated;

create or replace function public.admin_review_seller(
  _seller_id uuid,
  _status public.seller_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewed_user_id uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Forbidden';
  end if;

  if _status = 'pending' then
    raise exception 'A seller review must resolve to verified, rejected, or suspended';
  end if;

  update public.seller_profiles
  set status = _status, reviewed_at = now()
  where id = _seller_id
  returning user_id into reviewed_user_id;

  if reviewed_user_id is null then
    raise exception 'Seller application not found';
  end if;

  if _status <> 'verified' then
    update public.products
    set is_published = false, updated_at = now()
    where seller_user_id = reviewed_user_id and listing_type = 'seller';
  end if;
end;
$$;

revoke all on function public.admin_review_seller(uuid, public.seller_status) from public, anon;
grant execute on function public.admin_review_seller(uuid, public.seller_status) to authenticated;
