
create type public.app_role as enum ('customer','supplier','admin');
create type public.order_status as enum ('draft','awaiting_customer_deposit','open_for_assignment','assignment_payment_pending','assigned','purchased','in_transit','arrived','ready_for_handover','delivered','cancelled','expired','disputed');
create type public.supplier_status as enum ('pending','verified','rejected','suspended');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());
create policy "own roles read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'));
  insert into public.user_roles (user_id, role) values (new.id, 'customer');
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null default 0
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "categories public read" on public.categories for select to anon, authenticated using (true);
create policy "categories admin write" on public.categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  brand text,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  image_url text,
  price_etb_cents bigint not null check (price_etb_cents >= 0),
  deposit_percent int not null default 30 check (deposit_percent between 0 and 100),
  delivery_days int not null default 14,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "products public read" on public.products for select to anon, authenticated using (is_published or public.has_role(auth.uid(),'admin'));
create policy "products admin write" on public.products for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null,
  price_delta_etb_cents bigint not null default 0,
  is_available boolean not null default true,
  sort_order int not null default 0
);
grant select on public.product_variants to anon, authenticated;
grant insert, update, delete on public.product_variants to authenticated;
grant all on public.product_variants to service_role;
alter table public.product_variants enable row level security;
create policy "variants public read" on public.product_variants for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and (p.is_published or public.has_role(auth.uid(),'admin'))));
create policy "variants admin write" on public.product_variants for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  business_name text not null,
  base_city text not null default 'Dubai',
  phone text,
  notes text,
  status public.supplier_status not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
grant select, insert, update on public.suppliers to authenticated;
grant all on public.suppliers to service_role;
alter table public.suppliers enable row level security;
create policy "supplier own read" on public.suppliers for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "supplier apply" on public.suppliers for insert to authenticated with check (user_id = auth.uid() and status = 'pending');
create policy "supplier admin update" on public.suppliers for update to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('SH-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  customer_id uuid not null,
  status public.order_status not null default 'awaiting_customer_deposit',
  subtotal_etb_cents bigint not null,
  deposit_etb_cents bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "orders own read" on public.orders for select to authenticated using (customer_id = auth.uid() or public.has_role(auth.uid(),'admin') or (public.has_role(auth.uid(),'supplier') and status = 'open_for_assignment'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid,
  variant_id uuid,
  product_name text not null,
  variant_label text,
  image_url text,
  unit_price_etb_cents bigint not null,
  quantity int not null check (quantity > 0)
);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "items via order" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id));

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  note text,
  actor_id uuid,
  created_at timestamptz not null default now()
);
grant select on public.order_events to authenticated;
grant all on public.order_events to service_role;
alter table public.order_events enable row level security;
create policy "events via order" on public.order_events for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id));

create or replace function public.reserve_order(_variant_id uuid, _quantity int)
returns uuid language plpgsql security definer set search_path = public as $$
declare v record; unit bigint; sub bigint; dep bigint; oid uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if _quantity < 1 or _quantity > 10 then raise exception 'Quantity must be between 1 and 10'; end if;
  select pv.id, pv.label, pv.price_delta_etb_cents, pv.is_available, p.id as pid, p.name, p.image_url, p.price_etb_cents, p.deposit_percent, p.is_published
    into v from product_variants pv join products p on p.id = pv.product_id where pv.id = _variant_id;
  if not found or not v.is_published or not v.is_available then raise exception 'This item is not available'; end if;
  unit := v.price_etb_cents + v.price_delta_etb_cents;
  sub := unit * _quantity;
  dep := (sub * v.deposit_percent) / 100;
  insert into orders (customer_id, subtotal_etb_cents, deposit_etb_cents) values (auth.uid(), sub, dep) returning id into oid;
  insert into order_items (order_id, product_id, variant_id, product_name, variant_label, image_url, unit_price_etb_cents, quantity)
    values (oid, v.pid, v.id, v.name, v.label, v.image_url, unit, _quantity);
  insert into order_events (order_id, status, note, actor_id) values (oid, 'awaiting_customer_deposit', 'Reservation created', auth.uid());
  return oid;
end $$;
revoke all on function public.reserve_order(uuid,int) from public, anon;
grant execute on function public.reserve_order(uuid,int) to authenticated;

create or replace function public.admin_set_order_status(_order_id uuid, _status public.order_status, _note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Forbidden'; end if;
  update orders set status = _status, updated_at = now() where id = _order_id;
  insert into order_events (order_id, status, note, actor_id) values (_order_id, _status, _note, auth.uid());
end $$;
revoke all on function public.admin_set_order_status(uuid,public.order_status,text) from public, anon;
grant execute on function public.admin_set_order_status(uuid,public.order_status,text) to authenticated;

create or replace function public.admin_review_supplier(_supplier_id uuid, _status public.supplier_status)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Forbidden'; end if;
  update suppliers set status = _status, reviewed_at = now() where id = _supplier_id returning user_id into uid;
  if _status = 'verified' then
    insert into user_roles (user_id, role) values (uid, 'supplier') on conflict do nothing;
  else
    delete from user_roles where user_id = uid and role = 'supplier';
  end if;
end $$;
revoke all on function public.admin_review_supplier(uuid,public.supplier_status) from public, anon;
grant execute on function public.admin_review_supplier(uuid,public.supplier_status) to authenticated;

create policy "product images public read" on storage.objects for select using (bucket_id = 'product-images');
create policy "product images admin write" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and public.has_role(auth.uid(),'admin'));
create policy "product images admin delete" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and public.has_role(auth.uid(),'admin'));

insert into public.categories (slug, name, sort_order) values
 ('fragrance','Fragrance',1),('electronics','Electronics',2),('fashion','Fashion',3),('watches','Watches',4);

insert into public.products (slug, name, brand, description, category_id, price_etb_cents, deposit_percent, delivery_days, is_published) values
 ('oud-noir-eau-de-parfum','Oud Noir Eau de Parfum','Maison Al Reef','A deep, smoky oud with amber and rose. Sourced from authorised Dubai Mall retailers.',(select id from categories where slug='fragrance'),1450000,30,12,true),
 ('wireless-studio-headphones','Wireless Studio Headphones','Aural','Noise-cancelling over-ear headphones with 40-hour battery. Brand new, sealed box.',(select id from categories where slug='electronics'),2890000,30,14,true),
 ('leather-weekender-bag','Leather Weekender Bag','Sahra Atelier','Full-grain leather travel bag, handcrafted, with brass hardware.',(select id from categories where slug='fashion'),3200000,30,16,true),
 ('classic-steel-chronograph','Classic Steel Chronograph','Meridian','Stainless steel chronograph with sapphire crystal and two-year warranty.',(select id from categories where slug='watches'),5400000,30,14,true);

insert into public.product_variants (product_id, label, price_delta_etb_cents, sort_order)
select id, '50 ml', 0, 1 from products where slug='oud-noir-eau-de-parfum' union all
select id, '100 ml', 650000, 2 from products where slug='oud-noir-eau-de-parfum' union all
select id, 'Matte Black', 0, 1 from products where slug='wireless-studio-headphones' union all
select id, 'Sand', 0, 2 from products where slug='wireless-studio-headphones' union all
select id, 'Cognac', 0, 1 from products where slug='leather-weekender-bag' union all
select id, 'Ink', 0, 2 from products where slug='leather-weekender-bag' union all
select id, 'Silver dial', 0, 1 from products where slug='classic-steel-chronograph' union all
select id, 'Black dial', 0, 2 from products where slug='classic-steel-chronograph';
