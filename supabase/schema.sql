-- ==============================================================================
-- DEX STORES — Supabase Production Database Schema & Security Architecture
-- ==============================================================================
-- Architecture & Compliance:
-- 1. Strict Row-Level Security (RLS) on all public tables and storage buckets.
-- 2. Public anonymous users can ONLY READ active storefront catalogue data.
-- 3. Verified administrators can view all records (including inactive/drafts).
-- 4. Only authenticated accounts whose `app_metadata` has `role = 'admin'`
--    are authorized to execute INSERT, UPDATE, or DELETE operations.
-- 5. Regular authenticated users (customers) CANNOT manage store data.
-- 6. Hardened `SECURITY DEFINER` with fixed `search_path = ''` (empty search path).
-- 7. All policy statements use `DROP POLICY IF EXISTS` for safe re-execution.
-- 8. Table creation and seeds are idempotent (no data loss on re-runs).
-- ==============================================================================

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- ==============================================================================
-- 1. Helper Function: public.is_admin()
-- Evaluates the caller's JWT `app_metadata` to verify the administrator role.
-- CRITICAL SECURITY RULES:
-- a) Evaluates `app_metadata`, NEVER `user_metadata` (prevents self-escalation).
-- b) Explicitly sets `search_path = ''` with fully schema-qualified functions.
-- c) Uses safe text membership for boolean flags (prevents casting crashes).
-- ==============================================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or
    (auth.jwt() -> 'app_metadata' -> 'roles') ? 'admin' or
    (auth.jwt() -> 'app_metadata' ->> 'is_admin') in ('true', 't', '1'),
    false
  );
$$;

-- Restrict function execution permissions
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ==============================================================================
-- 2. Categories Table
-- ==============================================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  short_description text not null default '',
  editorial_summary text not null default '',
  image_url text not null default '',
  highlights jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.categories enable row level security;

-- Categories RLS Policies (Idempotent Definitions):
-- 1. Public Read Policy: ONLY evaluates `is_active = true` (NEVER calls is_admin())
drop policy if exists "Public users can view categories" on public.categories;
drop policy if exists "Public users can view active categories" on public.categories;
drop policy if exists "Public can view active categories" on public.categories;
create policy "Public can view active categories"
  on public.categories
  for select
  using (is_active = true);

-- 2. Admin Read Policy: Allows verified admins to view all categories (including inactive)
drop policy if exists "Admins can view all categories" on public.categories;
create policy "Admins can view all categories"
  on public.categories
  for select
  to authenticated
  using (public.is_admin());

-- 3. Admin Write Policies: Only verified administrators can insert, update, or delete
drop policy if exists "Admins can insert categories" on public.categories;
create policy "Admins can insert categories"
  on public.categories
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update categories" on public.categories;
create policy "Admins can update categories"
  on public.categories
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete categories" on public.categories;
create policy "Admins can delete categories"
  on public.categories
  for delete
  to authenticated
  using (public.is_admin());

-- ==============================================================================
-- 3. Products Table
-- ==============================================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  reference text unique not null,
  name text not null,
  category_id uuid references public.categories(id) on delete restrict,
  price_ngn numeric not null check (price_ngn >= 0),
  availability text not null default 'In Stock' check (availability in ('In Stock', 'Available on Order', 'Out of Stock')),
  stock integer not null default 0 check (stock >= 0),
  featured boolean not null default false,
  recently_added boolean not null default false,
  is_active boolean not null default true,
  created_at_order integer not null default 0,
  short_description text not null default '',
  description text not null default '',
  image_url text not null,
  gallery jsonb not null default '[]'::jsonb,
  specifications jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.products enable row level security;

-- Products RLS Policies (Idempotent Definitions):
-- 1. Public Read Policy: ONLY evaluates `is_active = true` (NEVER calls is_admin())
drop policy if exists "Public users can view products" on public.products;
drop policy if exists "Public users can view active products" on public.products;
drop policy if exists "Public can view active products" on public.products;
create policy "Public can view active products"
  on public.products
  for select
  using (is_active = true);

-- 2. Admin Read Policy: Allows verified admins to view all products (including inactive/drafts)
drop policy if exists "Admins can view all products" on public.products;
create policy "Admins can view all products"
  on public.products
  for select
  to authenticated
  using (public.is_admin());

-- 3. Admin Write Policies: Only verified administrators can insert, update, or delete
drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products"
  on public.products
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products"
  on public.products
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
  on public.products
  for delete
  to authenticated
  using (public.is_admin());

-- ==============================================================================
-- 4. Store Settings Table (Singleton Row Pattern)
-- ==============================================================================
create table if not exists public.store_settings (
  id text primary key default 'singleton' check (id = 'singleton'),
  brand_name text not null default 'DEX STORES',
  tagline text not null default 'Precision Automotive Parts, Scale Models & Essential Equipment',
  whatsapp_number text not null default '2340000000000',
  whatsapp_display text not null default '+234 (000) 000-0000',
  email text not null default 'enquiries@dexstores.example',
  address text not null default 'Commercial Trade Corridor, Lagos, Nigeria',
  business_hours text not null default 'Monday – Saturday, 8:30 AM – 6:00 PM WAT',
  sample_inventory_notice text not null default '',
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.store_settings enable row level security;

-- Store Settings RLS Policies (Idempotent Definitions):
-- A. Public Read: Any customer can view general store metadata and contact lines
drop policy if exists "Public users can view store settings" on public.store_settings;
create policy "Public users can view store settings"
  on public.store_settings
  for select
  using (true);

-- B. Admin Insert: Admins can insert the singleton row if missing
drop policy if exists "Admins can insert store settings" on public.store_settings;
create policy "Admins can insert store settings"
  on public.store_settings
  for insert
  to authenticated
  with check (public.is_admin());

-- C. Admin Update: Only verified administrators can update store configuration
drop policy if exists "Admins can update store settings" on public.store_settings;
create policy "Admins can update store settings"
  on public.store_settings
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Seed Initial Singleton Settings Row Idempotently
insert into public.store_settings (
  id,
  brand_name,
  tagline,
  whatsapp_number,
  whatsapp_display,
  email,
  address,
  business_hours,
  sample_inventory_notice
)
values (
  'singleton',
  'DEX STORES',
  'Precision Automotive Parts, Scale Models & Essential Equipment',
  '2340000000000',
  '+234 (000) 000-0000 (Configurable Business Line)',
  'enquiries@dexstores.example (Placeholder)',
  'Commercial Trade Corridor, Lagos, Nigeria (Address Placeholder)',
  'Monday – Saturday, 8:30 AM – 6:00 PM WAT',
  'Demonstration Catalogue Notice: The products and prices displayed below are sample items illustrating the DEX STORES storefront architecture prior to live inventory connection.'
)
on conflict (id) do nothing;

-- ==============================================================================
-- 5. Supabase Storage Policies (`product-images` bucket)
-- ==============================================================================
-- Explicitly ensure bucket is public (DO UPDATE preserves or forces public flag)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- Storage Policies (Idempotent & Fully Specified):
-- A. Public Read: Any user can download and view product images via CDN
drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
  on storage.objects
  for select
  using (bucket_id = 'product-images');

-- B. Admin Insert: Only verified administrators can upload product images
drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'product-images' and
    public.is_admin()
  );

-- C. Admin Update: Hardened with both USING and WITH CHECK
drop policy if exists "Admins can update product images" on storage.objects;
drop policy if exists "Admins can update and delete product images" on storage.objects;
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

-- D. Admin Delete: Administrators can delete product images
drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'product-images' and
    public.is_admin()
  );

-- ==============================================================================
-- 6. Provisioning an Administrator Account
-- Execute this query in the Supabase SQL Editor to grant admin rights to an existing user:
--
-- update auth.users
-- set raw_app_meta_data = jsonb_set(
--   coalesce(raw_app_meta_data, '{}'::jsonb),
--   '{role}',
--   '"admin"'
-- )
-- where email = 'your-admin-email@dexstores.com';
--
-- NOTE: If the user has an active session, they must sign out and sign back in,
-- or trigger a token refresh, for their JWT to include the updated `app_metadata`.
-- ==============================================================================
