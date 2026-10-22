-- Do not grant administrator access automatically to the first person who signs up.
-- Existing administrator assignments are preserved; only future sign-ups are affected.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates a customer profile and role. Administrator access must be provisioned explicitly by a trusted operator.';
