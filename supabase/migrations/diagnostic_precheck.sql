-- ==============================================================================
-- DEX STORES — Pre-Migration Diagnostic & Health Check Script (Safe & Non-Destructive)
-- File: supabase/migrations/diagnostic_precheck.sql
-- ==============================================================================
-- Purpose:
-- Completely READ-ONLY diagnostic queries to inspect the actual state of an
-- existing Supabase database BEFORE applying `phase_3_security_migration.sql`.
--
-- Safety Guarantees:
-- - Inspects column data types before attempting any numeric evaluations.
-- - Validates TEXT and VARCHAR inventory safely using regex without cast exceptions.
-- - Safely guards against NaN and Infinity values on float/numeric columns.
-- - Uses information_schema and dynamic inspection.
-- - NEVER directly references columns that may not exist in earlier schemas.
-- - Performs ZERO writes, drops, or modifications.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Inspect Products Table Structure & Stock Columns
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
order by ordinal_position;

-- Safe dynamic inspection of stock data (type-aware, never throws cast errors)
do $$
declare
  has_stock boolean;
  has_stock_qty boolean;
  stock_udt text;
  stock_qty_udt text;
  v_count integer;
  v_neg_count integer;
  v_frac_count integer;
  v_non_num_count integer;
  v_nan_inf_count integer;
begin
  select exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'products' and column_name = 'stock'
  ) into has_stock;

  select exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'products' and column_name = 'stock_quantity'
  ) into has_stock_qty;

  raise notice '=== [DIAGNOSTIC] PRODUCTS INVENTORY CHECK ===';
  raise notice 'Column "stock" exists: % | Column "stock_quantity" exists: %', has_stock, has_stock_qty;

  if has_stock then
    select udt_name into stock_udt
    from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'stock';

    raise notice 'products.stock data type: %', stock_udt;

    if stock_udt in ('int2', 'int4', 'int8', 'numeric', 'decimal', 'float4', 'float8') then
      execute 'select count(*) from public.products where stock is not null and stock::text in (''NaN'', ''Infinity'', ''-Infinity'')' into v_nan_inf_count;
      execute 'select count(*) from public.products where stock is not null and stock::text not in (''NaN'', ''Infinity'', ''-Infinity'') and stock < 0' into v_neg_count;
      execute 'select count(*) from public.products where stock is not null and stock::text not in (''NaN'', ''Infinity'', ''-Infinity'') and trunc(stock::numeric) <> stock::numeric' into v_frac_count;
      raise notice 'products.stock (numeric): NaN/Infinity rows = %, Negative rows = %, Fractional rows = %', v_nan_inf_count, v_neg_count, v_frac_count;
    elsif stock_udt in ('text', 'varchar') then
      execute 'select count(*) from public.products where stock is not null and trim(stock::text) !~ ''^\s*-?[0-9]+(\.[0-9]+)?\s*$''' into v_non_num_count;
      execute 'select count(*) from public.products where stock is not null and trim(stock::text) ~ ''^\s*-?[0-9]+(\.[0-9]+)?\s*$'' and stock::numeric < 0' into v_neg_count;
      execute 'select count(*) from public.products where stock is not null and trim(stock::text) ~ ''^\s*-?[0-9]+(\.[0-9]+)?\s*$'' and trunc(stock::numeric) <> stock::numeric' into v_frac_count;
      raise notice 'products.stock (text): Non-numeric rows = %, Negative rows = %, Fractional rows = %', v_non_num_count, v_neg_count, v_frac_count;
    else
      raise notice 'products.stock has unhandled type "%".', stock_udt;
    end if;
  end if;

  if has_stock_qty then
    select udt_name into stock_qty_udt
    from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'stock_quantity';

    raise notice 'products.stock_quantity data type: %', stock_qty_udt;

    if stock_qty_udt in ('int2', 'int4', 'int8', 'numeric', 'decimal', 'float4', 'float8') then
      execute 'select count(*) from public.products where stock_quantity is not null and stock_quantity::text in (''NaN'', ''Infinity'', ''-Infinity'')' into v_nan_inf_count;
      execute 'select count(*) from public.products where stock_quantity is not null and stock_quantity::text not in (''NaN'', ''Infinity'', ''-Infinity'') and stock_quantity < 0' into v_neg_count;
      execute 'select count(*) from public.products where stock_quantity is not null and stock_quantity::text not in (''NaN'', ''Infinity'', ''-Infinity'') and trunc(stock_quantity::numeric) <> stock_quantity::numeric' into v_frac_count;
      raise notice 'products.stock_quantity (numeric): NaN/Infinity rows = %, Negative rows = %, Fractional rows = %', v_nan_inf_count, v_neg_count, v_frac_count;
    elsif stock_qty_udt in ('text', 'varchar') then
      execute 'select count(*) from public.products where stock_quantity is not null and trim(stock_quantity::text) !~ ''^\s*-?[0-9]+(\.[0-9]+)?\s*$''' into v_non_num_count;
      execute 'select count(*) from public.products where stock_quantity is not null and trim(stock_quantity::text) ~ ''^\s*-?[0-9]+(\.[0-9]+)?\s*$'' and stock_quantity::numeric < 0' into v_neg_count;
      execute 'select count(*) from public.products where stock_quantity is not null and trim(stock_quantity::text) ~ ''^\s*-?[0-9]+(\.[0-9]+)?\s*$'' and trunc(stock_quantity::numeric) <> stock_quantity::numeric' into v_frac_count;
      raise notice 'products.stock_quantity (text): Non-numeric rows = %, Negative rows = %, Fractional rows = %', v_non_num_count, v_neg_count, v_frac_count;
    else
      raise notice 'products.stock_quantity has unhandled type "%".', stock_qty_udt;
    end if;
  end if;

  if has_stock and has_stock_qty then
    execute $dyn$
      select count(*)
      from public.products
      where stock is not null 
        and stock_quantity is not null
        and (
          case
            when trim(stock::text) ~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$' and trim(stock_quantity::text) ~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$'
            then stock::numeric <> stock_quantity::numeric
            else trim(stock::text) <> trim(stock_quantity::text)
          end
        )
    $dyn$ into v_count;
    raise notice 'Conflicting inventory rows (stock <> stock_quantity): %', v_count;
  end if;
end $$;

-- ------------------------------------------------------------------------------
-- 2. Inspect Products Gallery Column Type & Structure
-- ------------------------------------------------------------------------------
do $$
declare
  has_gallery boolean;
  has_gallery_jsonb boolean;
  gallery_udt text;
  v_count integer;
  v_non_array_count integer := 0;
begin
  select exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'products' and column_name = 'gallery'
  ) into has_gallery;

  select exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'products' and column_name = 'gallery_jsonb'
  ) into has_gallery_jsonb;

  raise notice '=== [DIAGNOSTIC] GALLERY COLUMN CHECK ===';
  raise notice 'Column "gallery" exists: % | Column "gallery_jsonb" exists: %', has_gallery, has_gallery_jsonb;

  if has_gallery then
    select udt_name into gallery_udt
    from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'gallery';
    raise notice 'products.gallery data type: %', gallery_udt;

    execute 'select count(*) from public.products where gallery is not null' into v_count;
    raise notice 'Populated rows in gallery: %', v_count;

    if gallery_udt in ('json', 'jsonb') then
      execute 'select count(*) from public.products where gallery is not null and jsonb_typeof(gallery::jsonb) <> ''array''' into v_non_array_count;
      raise notice 'Non-array JSON rows in gallery: %', v_non_array_count;
    end if;
  end if;

  if has_gallery_jsonb then
    execute 'select count(*) from public.products where gallery_jsonb is not null' into v_count;
    raise notice 'Populated rows in gallery_jsonb: %', v_count;
  end if;
end $$;

-- ------------------------------------------------------------------------------
-- 3. Inspect Store Settings Structure & Row Integrity
-- ------------------------------------------------------------------------------
select 
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public' 
  and table_name = 'store_settings'
order by ordinal_position;

do $$
declare
  has_settings boolean;
  v_total integer;
  v_distinct_configs integer;
begin
  select exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' and table_name = 'store_settings'
  ) into has_settings;

  raise notice '=== [DIAGNOSTIC] STORE SETTINGS INTEGRITY CHECK ===';
  if not has_settings then
    raise notice 'Table public.store_settings does not exist yet (will be created by migration).';
  else
    execute 'select count(*) from public.store_settings' into v_total;
    execute 'select count(distinct (to_jsonb(s) - ''id'' - ''updated_at'')) from public.store_settings s' into v_distinct_configs;
    raise notice 'Total store_settings rows: % | Distinct configurations: %', v_total, v_distinct_configs;
    if v_total > 1 and v_distinct_configs > 1 then
      raise warning 'CONFLICT DETECTED: % conflicting store_settings rows exist. Manual consolidation required before migration.', v_distinct_configs;
    end if;
  end if;
end $$;

-- ------------------------------------------------------------------------------
-- 4. Inspect Category References & Orphaned Products
-- ------------------------------------------------------------------------------
do $$
declare
  has_cat_id boolean;
  has_categories boolean;
  v_orphans integer;
begin
  select exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'products' and column_name = 'category_id'
  ) into has_cat_id;

  select exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' and table_name = 'categories'
  ) into has_categories;

  raise notice '=== [DIAGNOSTIC] FOREIGN KEY & CATEGORY ORPHANS ===';
  if has_cat_id and has_categories then
    execute 'select count(*) from public.products p where p.category_id is not null and not exists (select 1 from public.categories c where c.id = p.category_id)' into v_orphans;
    raise notice 'Orphaned category_id rows in products: %', v_orphans;
    if v_orphans > 0 then
      raise warning 'ORPHANS DETECTED: % product(s) reference non-existent category IDs. Migration will abort unless resolved.', v_orphans;
    end if;
  else
    raise notice 'category_id column or categories table not yet present.';
  end if;
end $$;

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

-- Diagnostic check for un-scoped or weak storage policies
do $$
declare
  v_unsafe_count integer := 0;
begin
  select count(*) into v_unsafe_count
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and (
      coalesce(qual, '') ilike '%bucket_id is not null%' or
      coalesce(qual, '') ilike '%bucket_id <>%' or
      coalesce(qual, '') ilike '%bucket_id !=%' or
      coalesce(qual, '') ilike '%bucket_id = any%' or
      coalesce(with_check, '') ilike '%bucket_id is not null%' or
      coalesce(with_check, '') ilike '%bucket_id <>%' or
      coalesce(with_check, '') ilike '%bucket_id !=%' or
      coalesce(with_check, '') ilike '%bucket_id = any%'
    );
  if v_unsafe_count > 0 then
    raise notice 'Detected % potentially weak storage policy(ies) (using IS NOT NULL, <>, !=, or ANY).', v_unsafe_count;
  end if;
end $$;

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
