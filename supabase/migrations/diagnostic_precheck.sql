-- ==============================================================================
-- DEX STORES — Pre-Migration Diagnostic & Health Check Script
-- File: supabase/migrations/diagnostic_precheck.sql
-- ==============================================================================
-- Purpose:
-- READ-ONLY diagnostic queries to inspect the current state of an existing
-- Supabase database BEFORE applying `phase_3_security_migration.sql`.
-- Run this in the Supabase SQL Editor. It performs NO modifications.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Inspect Products Stock Columns & Data Types
-- ------------------------------------------------------------------------------
select 
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public' 
  and table_name = 'products' 
  and column_name in ('stock', 'stock_quantity');

-- Check for negative, fractional, or conflicting stock values
do $$
declare
  has_stock boolean;
  has_stock_qty boolean;
  v_count integer;
begin
  select exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'products' and column_name = 'stock'
  ) into has_stock;

  select exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'products' and column_name = 'stock_quantity'
  ) into has_stock_qty;

  raise notice '=== PRODUCTS STOCK DIAGNOSTIC ===';
  raise notice 'Column "stock" exists: % | Column "stock_quantity" exists: %', has_stock, has_stock_qty;

  if has_stock and has_stock_qty then
    select count(*) into v_count from public.products where stock <> stock_quantity;
    raise notice 'Conflicting rows between stock and stock_quantity: %', v_count;
  end if;
end $$;

-- ------------------------------------------------------------------------------
-- 2. Inspect Products Gallery Column Type & Structure
-- ------------------------------------------------------------------------------
select 
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public' 
  and table_name = 'products' 
  and column_name in ('gallery', 'gallery_jsonb');

-- ------------------------------------------------------------------------------
-- 3. Inspect Store Settings Rows, Constraints & Primary Key
-- ------------------------------------------------------------------------------
select 
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public' 
  and table_name = 'store_settings';

-- Row count and distinct configuration check
select 
  count(*) as total_settings_rows,
  count(distinct id) as distinct_ids,
  count(distinct (brand_name, whatsapp_number, email)) as distinct_configurations
from public.store_settings;

-- ------------------------------------------------------------------------------
-- 4. Inspect Foreign Key & Orphaned Categories
-- ------------------------------------------------------------------------------
select 
  p.id as product_id,
  p.name as product_name,
  p.category_id as invalid_category_id
from public.products p
where p.category_id is not null
  and not exists (select 1 from public.categories c where c.id = p.category_id);

-- ------------------------------------------------------------------------------
-- 5. Inspect Storage Policies on storage.objects
-- ------------------------------------------------------------------------------
select 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects';

-- ------------------------------------------------------------------------------
-- 6. Inspect Public Table RLS Policies
-- ------------------------------------------------------------------------------
select 
  tablename,
  policyname,
  permissive,
  roles,
  cmd
from pg_policies
where schemaname = 'public' and tablename in ('products', 'categories', 'store_settings')
order by tablename, cmd;
