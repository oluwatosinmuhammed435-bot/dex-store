-- ==============================================================================
-- DEX STORES — Safe Idempotent Live Database Initialization & Admin Readiness
-- File: supabase/migrations/initialize_store_settings.sql
-- ==============================================================================
-- Purpose:
-- 1. Safely initializes public.store_settings with a single default configuration
--    row ONLY when public.store_settings is currently empty (0 rows).
-- 2. Compatible with BOTH live boolean-id schema (`id boolean`, `business_hours jsonb`)
--    and text-singleton schema (`id text = 'singleton'`), without altering existing
--    products.stock_quantity or products.gallery column types.
-- 3. Ensures public.is_admin() trusts ONLY JWT `app_metadata` (case-insensitive role)
--    and never `user_metadata`.
-- 4. Ensures public Storage bucket `product-images` exists cleanly (public reads,
--    admin-only writes).
-- 5. Does NOT insert any fake sample products or categories.
-- ==============================================================================

begin;

-- 1. Ensure hardened case-insensitive public.is_admin() function
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    lower(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', ''))) = 'admin' or
    (auth.jwt() -> 'app_metadata' -> 'roles') ? 'admin' or
    lower(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'roles', ''))) = 'admin' or
    lower(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', ''))) in ('true', 't', '1'),
    false
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 2. Ensure public.store_settings has safe RLS policies (idempotent)
alter table if exists public.store_settings enable row level security;

drop policy if exists "Public users can view store settings" on public.store_settings;
create policy "Public users can view store settings"
  on public.store_settings
  for select
  using (true);

drop policy if exists "Admins can insert store settings" on public.store_settings;
create policy "Admins can insert store settings"
  on public.store_settings
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update store settings" on public.store_settings;
create policy "Admins can update store settings"
  on public.store_settings
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 3. Idempotently initialize public.store_settings ONLY if 0 rows exist
do $$
declare
  v_row_count integer := 0;
  v_id_udt text;
  v_hours_udt text;
  v_id_val text;
  v_hours_expr text;
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'store_settings'
  ) then
    raise exception 'Table public.store_settings does not exist.';
  end if;

  select count(*) into v_row_count from public.store_settings;
  if v_row_count > 0 then
    raise notice 'public.store_settings already contains % row(s); skipping default initialization.', v_row_count;
    return;
  end if;

  select udt_name into v_id_udt
  from information_schema.columns
  where table_schema = 'public' and table_name = 'store_settings' and column_name = 'id';

  select udt_name into v_hours_udt
  from information_schema.columns
  where table_schema = 'public' and table_name = 'store_settings' and column_name = 'business_hours';

  if v_hours_udt in ('jsonb', 'json') then
    v_hours_expr := '''{"display": "Monday – Saturday, 8:30 AM – 6:00 PM WAT"}''::jsonb';
  else
    v_hours_expr := '''Monday – Saturday, 8:30 AM – 6:00 PM WAT''';
  end if;

  if v_id_udt = 'bool' then
    v_id_val := 'true';
  elsif v_id_udt in ('text', 'varchar') then
    v_id_val := '''singleton''';
  elsif v_id_udt in ('int2', 'int4', 'int8') then
    v_id_val := '1';
  else
    v_id_val := null;
  end if;

  if v_id_val is not null then
    execute format(
      'insert into public.store_settings (id, brand_name, tagline, whatsapp_number, email, address, business_hours)
       values (%s, %L, %L, %L, %L, %L, %s)
       on conflict (id) do nothing',
      v_id_val,
      'DEX STORES',
      'Precision Automotive Parts, Scale Models & Essential Equipment',
      '2340000000000',
      'enquiries@dexstores.example',
      'Commercial Trade Corridor, Lagos, Nigeria',
      v_hours_expr
    );
  else
    execute format(
      'insert into public.store_settings (brand_name, tagline, whatsapp_number, email, address, business_hours)
       values (%L, %L, %L, %L, %L, %s)',
      'DEX STORES',
      'Precision Automotive Parts, Scale Models & Essential Equipment',
      '2340000000000',
      'enquiries@dexstores.example',
      'Commercial Trade Corridor, Lagos, Nigeria',
      v_hours_expr
    );
  end if;

  raise notice 'Initialized default public.store_settings row safely.';
end $$;

-- 4. Ensure public `product-images` bucket and admin-restricted write policies exist
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
  on storage.objects
  for select
  using (bucket_id = 'product-images');

drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'product-images' and
    public.is_admin()
  );

drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'product-images' and
    public.is_admin()
  )
  with check (
    bucket_id = 'product-images' and
    public.is_admin()
  );

drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'product-images' and
    public.is_admin()
  );

commit;
