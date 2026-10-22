create table public.admin_action_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id),
  action text not null check (char_length(btrim(action)) between 1 and 80),
  entity_type text not null check (entity_type in ('order', 'seller', 'supplier', 'support_case')),
  entity_id uuid not null,
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index admin_action_events_created_at_idx on public.admin_action_events (created_at desc);
alter table public.admin_action_events enable row level security;
grant select on public.admin_action_events to authenticated;
create policy "admins read operational audit" on public.admin_action_events
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop function public.admin_set_order_status(uuid, public.order_status, text);
create function public.admin_set_order_status(_order_id uuid, _status public.order_status, _note text)
returns void language plpgsql security definer set search_path = public as $$
declare current_status public.order_status;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  if _note is null or char_length(btrim(_note)) not between 1 and 500 then
    raise exception 'Provide a reason between 1 and 500 characters';
  end if;
  if _status not in ('cancelled', 'expired') then
    raise exception 'Payment and dispute statuses must come from their verified workflows';
  end if;
  select status into current_status from public.orders where id = _order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if current_status not in ('draft', 'awaiting_customer_deposit', 'open_for_assignment') then
    raise exception 'This order can no longer be cancelled or expired through operations';
  end if;
  if exists (select 1 from public.payment_attempts where order_id = _order_id and status = 'succeeded') then
    raise exception 'Orders with a successful payment require the refund workflow';
  end if;
  update public.orders set status = _status, updated_at = now() where id = _order_id;
  insert into public.order_events (order_id, status, note, actor_id) values (_order_id, _status, btrim(_note), auth.uid());
  insert into public.admin_action_events (actor_id, action, entity_type, entity_id, reason)
  values (auth.uid(), _status::text, 'order', _order_id, btrim(_note));
end;
$$;
revoke all on function public.admin_set_order_status(uuid, public.order_status, text) from public, anon;
grant execute on function public.admin_set_order_status(uuid, public.order_status, text) to authenticated;

drop function public.admin_review_seller(uuid, public.seller_status);
create function public.admin_review_seller(_seller_id uuid, _status public.seller_status, _note text)
returns void language plpgsql security definer set search_path = public as $$
declare reviewed_user_id uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  if _status = 'pending' then raise exception 'A seller review must resolve to verified, rejected, or suspended'; end if;
  if _note is null or char_length(btrim(_note)) not between 1 and 500 then raise exception 'Provide a reason between 1 and 500 characters'; end if;
  update public.seller_profiles set status = _status, reviewed_at = now()
  where id = _seller_id returning user_id into reviewed_user_id;
  if reviewed_user_id is null then raise exception 'Seller application not found'; end if;
  if _status <> 'verified' then
    update public.products set is_published = false, updated_at = now()
    where seller_user_id = reviewed_user_id and listing_type = 'seller';
  end if;
  insert into public.admin_action_events (actor_id, action, entity_type, entity_id, reason)
  values (auth.uid(), _status::text, 'seller', _seller_id, btrim(_note));
end;
$$;
revoke all on function public.admin_review_seller(uuid, public.seller_status, text) from public, anon;
grant execute on function public.admin_review_seller(uuid, public.seller_status, text) to authenticated;

drop function public.admin_review_supplier(uuid, public.supplier_status);
create function public.admin_review_supplier(_supplier_id uuid, _status public.supplier_status, _note text)
returns void language plpgsql security definer set search_path = public as $$
declare reviewed_user_id uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  if _status = 'pending' then raise exception 'A partner review must resolve to verified, rejected, or suspended'; end if;
  if _note is null or char_length(btrim(_note)) not between 1 and 500 then raise exception 'Provide a reason between 1 and 500 characters'; end if;
  update public.suppliers set status = _status, reviewed_at = now()
  where id = _supplier_id returning user_id into reviewed_user_id;
  if reviewed_user_id is null then raise exception 'Partner application not found'; end if;
  if _status = 'verified' then
    insert into public.user_roles (user_id, role) values (reviewed_user_id, 'supplier') on conflict do nothing;
  else
    delete from public.user_roles where user_id = reviewed_user_id and role = 'supplier';
  end if;
  insert into public.admin_action_events (actor_id, action, entity_type, entity_id, reason)
  values (auth.uid(), _status::text, 'supplier', _supplier_id, btrim(_note));
end;
$$;
revoke all on function public.admin_review_supplier(uuid, public.supplier_status, text) from public, anon;
grant execute on function public.admin_review_supplier(uuid, public.supplier_status, text) to authenticated;

create or replace function public.admin_set_support_case_status(
  _case_id uuid,
  _status public.support_case_status,
  _note text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  if _note is null or char_length(btrim(_note)) not between 1 and 500 then raise exception 'Provide a reason between 1 and 500 characters'; end if;
  perform 1 from public.support_cases where id = _case_id for update;
  if not found then raise exception 'Support case not found'; end if;
  update public.support_cases set status = _status, updated_at = now() where id = _case_id;
  insert into public.support_case_events (case_id, actor_id, status, note) values (_case_id, auth.uid(), _status, btrim(_note));
  insert into public.admin_action_events (actor_id, action, entity_type, entity_id, reason)
  values (auth.uid(), _status::text, 'support_case', _case_id, btrim(_note));
end;
$$;
revoke all on function public.admin_set_support_case_status(uuid, public.support_case_status, text) from public, anon;
grant execute on function public.admin_set_support_case_status(uuid, public.support_case_status, text) to authenticated;
