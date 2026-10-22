create type public.product_media_status as enum ('pending', 'approved', 'rejected');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('seller-listing-media', 'seller-listing-media', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;

create table public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  seller_user_id uuid not null references auth.users(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  object_path text not null unique,
  alt_text text not null check (char_length(btrim(alt_text)) between 3 and 160),
  sort_order integer not null default 0 check (sort_order between 0 and 20),
  moderation_status public.product_media_status not null default 'pending',
  moderation_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint product_media_path_owner_check check (
    split_part(object_path, '/', 1) = seller_user_id::text
    and split_part(object_path, '/', 2) = product_id::text
  )
);
create index product_media_product_sort_idx on public.product_media (product_id, sort_order, created_at);
create index product_media_moderation_idx on public.product_media (moderation_status, created_at);
alter table public.product_media enable row level security;
grant select, insert, delete on public.product_media to authenticated;
grant select on public.product_media to anon;
grant all on public.product_media to service_role;

create policy "public reads approved media of published products" on public.product_media
  for select to anon, authenticated using (
    (moderation_status = 'approved' and exists (
      select 1 from public.products p where p.id = product_id and p.is_published
    ))
    or seller_user_id = auth.uid()
    or public.has_role(auth.uid(), 'admin')
  );
create policy "verified sellers add own listing media" on public.product_media
  for insert to authenticated with check (
    seller_user_id = auth.uid()
    and moderation_status = 'pending'
    and exists (
      select 1 from public.products p
      where p.id = product_id and p.seller_user_id = auth.uid() and p.listing_type = 'seller'
    )
    and (variant_id is null or exists (
      select 1 from public.product_variants v where v.id = variant_id and v.product_id = product_id
    ))
    and public.is_verified_seller(auth.uid())
  );
create policy "sellers remove own media" on public.product_media
  for delete to authenticated using (seller_user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "verified sellers upload listing media" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'seller-listing-media'
    and split_part(name, '/', 1) = auth.uid()::text
    and split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
    and public.is_verified_seller(auth.uid())
    and exists (
      select 1 from public.products p
      where p.id::text = split_part(name, '/', 2)
        and p.seller_user_id = auth.uid() and p.listing_type = 'seller'
    )
  );
create policy "listing media access follows moderation" on storage.objects
  for select to anon, authenticated using (
    bucket_id = 'seller-listing-media' and exists (
      select 1 from public.product_media pm
      join public.products p on p.id = pm.product_id
      where pm.object_path = name and (
        (pm.moderation_status = 'approved' and p.is_published)
        or pm.seller_user_id = auth.uid()
        or public.has_role(auth.uid(), 'admin')
      )
    )
  );
create policy "listing media owner or admin delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'seller-listing-media' and (
      public.has_role(auth.uid(), 'admin')
      or (
        split_part(name, '/', 1) = auth.uid()::text
        and exists (select 1 from public.products p
          where p.id::text = split_part(name, '/', 2)
            and p.seller_user_id = auth.uid() and p.listing_type = 'seller')
      )
    )
  );

create table public.product_media_reports (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.product_media(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 10 and 500),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (media_id, reporter_id)
);
create index product_media_reports_status_idx on public.product_media_reports (status, created_at);
alter table public.product_media_reports enable row level security;
grant select on public.product_media_reports to authenticated;
create policy "admins read media reports" on public.product_media_reports
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace function public.report_product_media(_media_id uuid, _reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare report_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to report listing media'; end if;
  if _reason is null or char_length(btrim(_reason)) not between 10 and 500 then
    raise exception 'Report reason must be between 10 and 500 characters';
  end if;
  if not exists (
    select 1 from public.product_media pm join public.products p on p.id = pm.product_id
    where pm.id = _media_id and pm.moderation_status = 'approved' and p.is_published
  ) then raise exception 'Listing image not found'; end if;
  insert into public.product_media_reports (media_id, reporter_id, reason)
  values (_media_id, auth.uid(), btrim(_reason)) returning id into report_id;
  return report_id;
exception when unique_violation then
  raise exception 'You have already reported this image';
end;
$$;
revoke all on function public.report_product_media(uuid, text) from public, anon;
grant execute on function public.report_product_media(uuid, text) to authenticated;

create or replace function public.admin_review_product_media(_media_id uuid, _status public.product_media_status, _note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  if _status not in ('approved', 'rejected') then raise exception 'Choose approved or rejected'; end if;
  if _note is null or char_length(btrim(_note)) not between 1 and 500 then
    raise exception 'Provide a moderation reason between 1 and 500 characters';
  end if;
  update public.product_media
  set moderation_status = _status, moderation_note = btrim(_note), reviewed_by = auth.uid(), reviewed_at = now()
  where id = _media_id;
  if not found then raise exception 'Listing image not found'; end if;
  update public.product_media_reports set status = 'resolved', resolved_at = now()
  where media_id = _media_id and status = 'open';
  insert into public.admin_action_events (actor_id, action, entity_type, entity_id, reason)
  values (auth.uid(), _status::text, 'listing_media', _media_id, btrim(_note));
end;
$$;
revoke all on function public.admin_review_product_media(uuid, public.product_media_status, text) from public, anon;
grant execute on function public.admin_review_product_media(uuid, public.product_media_status, text) to authenticated;

alter table public.admin_action_events drop constraint admin_action_events_entity_type_check;
alter table public.admin_action_events add constraint admin_action_events_entity_type_check
  check (entity_type in ('order', 'seller', 'supplier', 'support_case', 'listing_media'));
