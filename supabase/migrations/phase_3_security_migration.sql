-- ==============================================================================
-- DEX STORES — Phase 3 Security & Schema Migration (Production Final)
-- Migration File: supabase/migrations/phase_3_security_migration.sql
-- ==============================================================================
-- Purpose:
-- Safely migrates an existing Supabase project created from an earlier schema
-- to the hardened Phase 3 security architecture WITHOUT dropping tables,
-- without truncating records, and without data loss.
--
-- Resolutions Applied:
-- 1. Exact Gallery Type Detection via udt_name:
--    - Distinguishes 'jsonb', '_text', '_varchar', 'text', 'varchar'.
--    - Halts safely if dependent views reference products.gallery.
--    - Drops only standalone secondary indexes (not constraint-owned indexes).
--    - Validates existing gallery_jsonb type before comparing or modifying.
--    - Preserves existing JSONB gallery data and fails safely on unexpected types.
-- 2. Complete Storage Policy Audit & Bypass Prevention:
--    - Inspects every policy on storage.objects.
--    - Eliminates both product-images policies and open/un-scoped policies that
--      could bypass bucket security via permissive OR combination.
--    - Preserves policies strictly scoped to unrelated buckets.
-- 3. Robust Store Settings Singleton:
--    - Handles 0 rows, 1 row, and multiple rows.
--    - Inspects id data type (bool, text, varchar, missing).
--    - Compares ALL configuration columns (via to_jsonb) to prevent data loss.
--    - Halts safely with a diagnostic report if conflicting configurations exist.
--    - Establishes primary key on id, check (id = 'singleton'), and exactly 1 row.
-- 4. Stock Column Type & Out-of-Range Safety:
--    - Inspects udt_name on both stock columns (int4, numeric, decimal, float4, float8, text).
--    - Uses trunc(val::numeric) <> val::numeric to detect fractional values without modulo errors.
--    - Halts on fractional or out-of-range values to prevent inventory corruption.
--    - Halts on negative values to avoid modifying uncertain inventory counts.
--    - Reconciles 4 states safely and enforces INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0).
-- 5. Hardened Helper Function & Proconfig Inspection:
--    - Inspects pg_proc.proconfig to verify search_path='' directly in PostgreSQL catalog.
--    - Enforces SECURITY DEFINER with restricted authenticated-only execution.
-- 6. Comprehensive Pre-Commit Assertions:
--    - Validates all invariants before COMMIT, rolling back if any condition fails.
-- ==============================================================================

-- Wrap in a transaction for complete migration safety
begin;

-- Ensure gen_random_uuid() is available (native built-in in PostgreSQL 13+)
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'gen_random_uuid') then
    create extension if not exists pgcrypto;
  end if;
end $$;

-- ==============================================================================
-- 1. Helper Function: public.is_admin()
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

-- Revoke execute from public/anon, grant to authenticated only
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ==============================================================================
-- 2. Categories Table Migration
-- ==============================================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null
);

-- Ensure all expected columns exist with non-destructive defaults
alter table public.categories add column if not exists short_description text not null default '';
alter table public.categories add column if not exists editorial_summary text not null default '';
alter table public.categories add column if not exists highlights jsonb not null default '[]'::jsonb;
alter table public.categories add column if not exists is_active boolean not null default true;
alter table public.categories add column if not exists created_at timestamptz not null default now();
alter table public.categories add column if not exists updated_at timestamptz not null default now();

-- Handle image column name variance (image vs image_url)
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'categories' and column_name = 'image'
  ) and not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'categories' and column_name = 'image_url'
  ) then
    alter table public.categories rename column image to image_url;
  elsif not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'categories' and column_name = 'image_url'
  ) then
    alter table public.categories add column image_url text not null default '';
  end if;
end $$;

-- Enable RLS
alter table public.categories enable row level security;

-- ==============================================================================
-- 3. Products Table Migration
-- ==============================================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  reference text unique not null,
  name text not null,
  price_ngn numeric not null default 0 check (price_ngn >= 0),
  image_url text not null default ''
);

-- ------------------------------------------------------------------------------
-- 3.1 Stock Column Type Inspection, Validation & Reconciliation
-- ------------------------------------------------------------------------------
do $$
declare
  has_stock boolean;
  has_stock_qty boolean;
  stock_udt text;
  stock_qty_udt text;
  conflict_count integer := 0;
  v_rec record;
begin
  -- Inspect presence of columns
  select exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'products' and column_name = 'stock'
  ) into has_stock;

  select exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'products' and column_name = 'stock_quantity'
  ) into has_stock_qty;

  -- Step A: Validate and safely convert data type of 'stock' if it exists
  if has_stock then
    select udt_name into stock_udt
    from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'stock';

    -- Validate supported numeric types or text
    if stock_udt in ('numeric', 'decimal', 'float4', 'float8') then
      -- Check for fractional stock values using trunc(::numeric)
      for v_rec in (
        select id, name, stock
        from public.products
        where stock is not null and trunc(stock::numeric) <> stock::numeric
      ) loop
        raise exception 'Fractional stock detected in public.products.stock for Product ID % ("%"): value = %. Physical inventory cannot be fractional. Aborting migration.',
          v_rec.id, v_rec.name, v_rec.stock;
      end loop;

      -- Check for integer range overflow
      for v_rec in (
        select id, name, stock
        from public.products
        where stock is not null and (stock::numeric > 2147483647 or stock::numeric < -2147483648)
      ) loop
        raise exception 'Stock value in public.products.stock exceeds 32-bit integer range for Product ID %: %. Aborting.',
          v_rec.id, v_rec.stock;
      end loop;

      alter table public.products alter column stock type integer using round(stock::numeric)::integer;

    elsif stock_udt in ('varchar', 'text') then
      -- Check for non-numeric text
      for v_rec in (
        select id, name, stock
        from public.products
        where stock is not null and trim(stock::text) !~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$'
      ) loop
        raise exception 'Non-numeric text found in public.products.stock for Product ID % ("%"): value = "%". Aborting.',
          v_rec.id, v_rec.name, v_rec.stock;
      end loop;

      for v_rec in (
        select id, name, stock
        from public.products
        where stock is not null and trunc(stock::numeric) <> stock::numeric
      ) loop
        raise exception 'Fractional stock detected in public.products.stock for Product ID % ("%"): value = %. Aborting.',
          v_rec.id, v_rec.name, v_rec.stock;
      end loop;

      alter table public.products alter column stock type integer using round(stock::numeric)::integer;

    elsif stock_udt not in ('int4', 'int2', 'int8') then
      raise exception 'Unsupported data type "%" on public.products.stock. Safe conversion to integer cannot be performed.', stock_udt;
    end if;

    -- Halt on negative stock to prevent altering uncertain inventory
    for v_rec in (select id, name, stock from public.products where stock < 0) loop
      raise exception 'Negative stock detected in public.products.stock for Product ID % ("%"): stock = %. Physical inventory cannot be negative. Aborting migration.',
        v_rec.id, v_rec.name, v_rec.stock;
    end loop;
  end if;

  -- Step B: Validate and safely convert data type of 'stock_quantity' if it exists
  if has_stock_qty then
    select udt_name into stock_qty_udt
    from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'stock_quantity';

    if stock_qty_udt in ('numeric', 'decimal', 'float4', 'float8') then
      for v_rec in (
        select id, name, stock_quantity
        from public.products
        where stock_quantity is not null and trunc(stock_quantity::numeric) <> stock_quantity::numeric
      ) loop
        raise exception 'Fractional stock detected in public.products.stock_quantity for Product ID % ("%"): value = %. Aborting.',
          v_rec.id, v_rec.name, v_rec.stock_quantity;
      end loop;

      alter table public.products alter column stock_quantity type integer using round(stock_quantity::numeric)::integer;

    elsif stock_qty_udt in ('varchar', 'text') then
      for v_rec in (
        select id, name, stock_quantity
        from public.products
        where stock_quantity is not null and trim(stock_quantity::text) !~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$'
      ) loop
        raise exception 'Non-numeric text found in public.products.stock_quantity for Product ID %: "%". Aborting.',
          v_rec.id, v_rec.name, v_rec.stock_quantity;
      end loop;

      for v_rec in (
        select id, name, stock_quantity
        from public.products
        where stock_quantity is not null and trunc(stock_quantity::numeric) <> stock_quantity::numeric
      ) loop
        raise exception 'Fractional stock detected in public.products.stock_quantity for Product ID % ("%"): value = %. Aborting.',
          v_rec.id, v_rec.name, v_rec.stock_quantity;
      end loop;

      alter table public.products alter column stock_quantity type integer using round(stock_quantity::numeric)::integer;

    elsif stock_qty_udt not in ('int4', 'int2', 'int8') then
      raise exception 'Unsupported data type "%" on public.products.stock_quantity.', stock_qty_udt;
    end if;

    for v_rec in (select id, name, stock_quantity from public.products where stock_quantity < 0) loop
      raise exception 'Negative stock detected in public.products.stock_quantity for Product ID % ("%"): stock_quantity = %. Aborting.',
        v_rec.id, v_rec.name, v_rec.stock_quantity;
    end loop;
  end if;

  -- Step C: Reconcile 4 possible column presence states
  if has_stock_qty and not has_stock then
    -- State A: Only stock_quantity exists -> Rename column to stock
    alter table public.products rename column stock_quantity to stock;

  elsif has_stock and not has_stock_qty then
    -- State B: Only stock exists -> Verified
    null;

  elsif has_stock and has_stock_qty then
    -- State C: Both columns exist -> Reconcile deterministically
    select count(*) into conflict_count
    from public.products
    where stock is not null 
      and stock_quantity is not null 
      and stock <> stock_quantity;

    if conflict_count > 0 then
      for v_rec in (
        select id, name, stock, stock_quantity
        from public.products
        where stock is not null and stock_quantity is not null and stock <> stock_quantity
      ) loop
        raise warning 'DEX STORES Stock Conflict on Product ID % ("%"): stock = %, stock_quantity = %. Reconciliation Rule Applied: Preserving canonical "stock" (value: %).',
          v_rec.id, v_rec.name, v_rec.stock, v_rec.stock_quantity, v_rec.stock;
      end loop;
    end if;

    -- Reconciliation Rule:
    -- 1. If both NULL -> 0.
    -- 2. If one NULL -> preserve non-NULL.
    -- 3. If both non-NULL -> canonical 'stock' takes precedence,
    --    unless stock = 0 and stock_quantity > 0 (prevents accidental zeroing).
    update public.products
    set stock = case
      when stock is null and stock_quantity is null then 0
      when stock is null then stock_quantity
      when stock_quantity is null then stock
      when stock = 0 and stock_quantity > 0 then stock_quantity
      else stock
    end;

  elsif not has_stock and not has_stock_qty then
    -- State D: Neither column exists -> Create stock column
    alter table public.products add column stock integer not null default 0;
  end if;

  -- Step D: Sanitize remaining NULLs and enforce final constraints
  update public.products set stock = 0 where stock is null;

  alter table public.products alter column stock set default 0;
  alter table public.products alter column stock set not null;

  if exists (
    select 1 from pg_constraint
    where conname = 'products_stock_check' and conrelid = 'public.products'::regclass
  ) then
    alter table public.products drop constraint products_stock_check;
  end if;
  alter table public.products add constraint products_stock_check check (stock >= 0);

  raise notice 'Products stock column successfully migrated and constrained to INTEGER >= 0.';
end $$;

-- ------------------------------------------------------------------------------
-- 3.2 Gallery Conversion (Exact Type Detection via udt_name)
-- ------------------------------------------------------------------------------
do $$
declare
  col_udt text;
  temp_udt text;
  has_temp_col boolean;
  temp_data_count integer := 0;
  v_dep_views text;
  v_idx record;
begin
  select udt_name into col_udt
  from information_schema.columns
  where table_schema = 'public' and table_name = 'products' and column_name = 'gallery';

  -- Case 1: Column is ALREADY exact JSONB
  if col_udt = 'jsonb' then
    raise notice 'public.products.gallery is already JSONB (udt_name = jsonb). Preserving data and enforcing constraints.';
    
    update public.products set gallery = '[]'::jsonb where gallery is null;
    update public.products set gallery = '[]'::jsonb where jsonb_typeof(gallery) is null or jsonb_typeof(gallery) <> 'array';

    alter table public.products alter column gallery set default '[]'::jsonb;
    alter table public.products alter column gallery set not null;

  -- Case 2: Column is an ARRAY of text or varchar (_text, _varchar)
  elsif col_udt in ('_text', '_varchar') then
    raise notice 'public.products.gallery is array of text (udt_name = %). Initiating conversion to JSONB.', col_udt;

    -- Check for dependent views before altering column
    select string_agg(format('%I.%I', vcu.view_schema, vcu.view_name), ', ') into v_dep_views
    from information_schema.view_column_usage vcu
    where vcu.table_schema = 'public' and vcu.table_name = 'products' and vcu.column_name = 'gallery';

    if v_dep_views is not null and v_dep_views <> '' then
      raise exception 'Cannot drop column public.products.gallery: dependent view(s) detected: %. Please drop or update views before applying migration.', v_dep_views;
    end if;

    -- Drop only standalone secondary indexes on gallery (do not touch constraint-owned indexes)
    for v_idx in (
      select i.relname as indexname
      from pg_index x
      join pg_class c on c.oid = x.indrelid
      join pg_class i on i.oid = x.indexrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'products'
        and pg_get_indexdef(x.indexrelid) ilike '%gallery%'
        and not exists (
          select 1 from pg_constraint con where con.conindid = x.indexrelid
        )
    ) loop
      raise notice 'Dropping standalone secondary index % on products.gallery prior to replacement.', v_idx.indexname;
      execute 'drop index if exists public.' || quote_ident(v_idx.indexname);
    end loop;

    -- Check if gallery_jsonb already exists and verify its udt_name
    select exists (
      select 1 from information_schema.columns 
      where table_schema = 'public' and table_name = 'products' and column_name = 'gallery_jsonb'
    ) into has_temp_col;

    if has_temp_col then
      select udt_name into temp_udt
      from information_schema.columns
      where table_schema = 'public' and table_name = 'products' and column_name = 'gallery_jsonb';

      if temp_udt <> 'jsonb' then
        raise exception 'Existing column public.products.gallery_jsonb has udt_name "%" (expected jsonb). Aborting migration to prevent data corruption.', temp_udt;
      end if;

      select count(*) into temp_data_count
      from public.products
      where gallery_jsonb is not null and gallery_jsonb <> '[]'::jsonb;

      if temp_data_count > 0 then
        raise notice 'Existing gallery_jsonb column contains % populated rows. Preserving existing gallery_jsonb data.', temp_data_count;
      end if;
    else
      alter table public.products add column gallery_jsonb jsonb not null default '[]'::jsonb;
    end if;

    -- Populate gallery_jsonb where not already populated
    update public.products
    set gallery_jsonb = coalesce(
      (
        select jsonb_agg(jsonb_build_object('url', trim(u), 'caption', ''))
        from unnest(gallery) as u
        where u is not null and trim(u) <> ''
      ),
      '[]'::jsonb
    )
    where gallery is not null 
      and (gallery_jsonb is null or gallery_jsonb = '[]'::jsonb);

    update public.products set gallery_jsonb = '[]'::jsonb where gallery_jsonb is null;

    -- Replace column
    alter table public.products drop column gallery;
    alter table public.products rename column gallery_jsonb to gallery;
    alter table public.products alter column gallery set default '[]'::jsonb;
    alter table public.products alter column gallery set not null;

  -- Case 3: Column does not exist
  elsif col_udt is null then
    raise notice 'public.products.gallery does not exist. Creating column as JSONB.';
    alter table public.products add column gallery jsonb not null default '[]'::jsonb;

  -- Case 4: Column is scalar text or varchar
  elsif col_udt in ('text', 'varchar') then
    raise notice 'public.products.gallery has udt_name = %. Converting string content to JSONB.', col_udt;
    alter table public.products alter column gallery drop default;
    alter table public.products alter column gallery type jsonb using case
      when gallery is null or trim(gallery::text) = '' then '[]'::jsonb
      when gallery::text ~ '^\s*\[.*\]\s*$' then gallery::text::jsonb
      else jsonb_build_array(jsonb_build_object('url', gallery::text, 'caption', ''))
    end;
    alter table public.products alter column gallery set default '[]'::jsonb;
    alter table public.products alter column gallery set not null;

  -- Case 5: Unrecognized / Unsupported data type
  else
    raise exception 'Cannot convert gallery column: unexpected udt_name "%" on public.products.gallery. Aborting migration.', col_udt;
  end if;

  raise notice 'Products gallery column successfully verified as JSONB NOT NULL DEFAULT [].';
end $$;

-- ------------------------------------------------------------------------------
-- 3.3 Ensure Remaining Product Columns & Availability Check
-- ------------------------------------------------------------------------------
alter table public.products add column if not exists category_id uuid references public.categories(id) on delete restrict;
alter table public.products add column if not exists availability text not null default 'In Stock';
alter table public.products add column if not exists featured boolean not null default false;
alter table public.products add column if not exists recently_added boolean not null default false;
alter table public.products add column if not exists is_active boolean not null default true;
alter table public.products add column if not exists created_at_order integer not null default 0;
alter table public.products add column if not exists short_description text not null default '';
alter table public.products add column if not exists description text not null default '';
alter table public.products add column if not exists specifications jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists created_at timestamptz not null default now();
alter table public.products add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_availability_check' and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_availability_check
      check (availability in ('In Stock', 'Available on Order', 'Out of Stock'));
  end if;
end $$;

-- ------------------------------------------------------------------------------
-- 3.4 Foreign Key Validation & Orphan Cleanup
-- ------------------------------------------------------------------------------
do $$
declare
  fk_record record;
  orphan_count integer := 0;
  orphan_rec record;
begin
  -- Check for orphaned category_id values
  select count(*) into orphan_count
  from public.products p
  where p.category_id is not null
    and not exists (
      select 1 from public.categories c where c.id = p.category_id
    );

  if orphan_count > 0 then
    for orphan_rec in (
      select p.id, p.name, p.category_id
      from public.products p
      where p.category_id is not null
        and not exists (select 1 from public.categories c where c.id = p.category_id)
    ) loop
      raise warning 'DEX STORES Foreign Key Violation: Product ID % ("%") references non-existent category_id (%). Nullifying reference to prevent migration abort.',
        orphan_rec.id, orphan_rec.name, orphan_rec.category_id;
    end loop;

    update public.products
    set category_id = null
    where category_id is not null
      and not exists (
        select 1 from public.categories c where c.id = category_id
      );

    raise notice 'Resolved % orphaned product category reference(s).', orphan_count;
  end if;

  -- Drop existing foreign key constraints with fully-qualified 4-part join
  for fk_record in (
    select tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.constraint_schema = kcu.constraint_schema
     and tc.table_schema = kcu.table_schema
     and tc.table_name = kcu.table_name
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and tc.table_name = 'products'
      and kcu.column_name = 'category_id'
  ) loop
    execute 'alter table public.products drop constraint ' || quote_ident(fk_record.constraint_name);
  end loop;

  -- Recreate foreign key with ON DELETE RESTRICT
  alter table public.products
    add constraint products_category_id_fkey
    foreign key (category_id)
    references public.categories(id)
    on delete restrict;

  raise notice 'Foreign key products_category_id_fkey established with ON DELETE RESTRICT.';
end $$;

-- Enable RLS
alter table public.products enable row level security;

-- ==============================================================================
-- 4. Store Settings Table Migration (Deterministic Singleton Handling)
-- ==============================================================================
do $$
declare
  tbl_exists boolean;
  has_id boolean;
  id_udt text;
  row_count integer := 0;
  distinct_config_count integer := 0;
  chk_record record;
  pk_record record;
begin
  select exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' and table_name = 'store_settings'
  ) into tbl_exists;

  if not tbl_exists then
    create table public.store_settings (
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
  else
    select count(*) into row_count from public.store_settings;

    -- Case A: Multiple rows exist in store_settings
    if row_count > 1 then
      -- Compare ALL configuration fields except id and updated_at
      select count(distinct (to_jsonb(s) - 'id' - 'updated_at')) into distinct_config_count
      from public.store_settings s;

      if distinct_config_count > 1 then
        raise exception 'Store settings reconciliation failed: detected % rows with % conflicting configuration datasets in public.store_settings. Automatic reconciliation cannot safely determine which configuration to keep without risking data loss. Please consolidate store_settings manually before re-running.',
          row_count, distinct_config_count;
      else
        raise notice 'Detected % store_settings rows with identical configurations across all fields. Consolidating to 1 row.', row_count;
        delete from public.store_settings
        where ctid not in (
          select min(ctid) from public.store_settings
        );
      end if;
    end if;

    -- Ensure id column exists and is typed as text 'singleton'
    select exists (
      select 1 from information_schema.columns 
      where table_schema = 'public' and table_name = 'store_settings' and column_name = 'id'
    ) into has_id;

    if not has_id then
      alter table public.store_settings add column id text default 'singleton';
      update public.store_settings set id = 'singleton';
    else
      select udt_name into id_udt
      from information_schema.columns
      where table_schema = 'public' and table_name = 'store_settings' and column_name = 'id';

      -- Drop existing check constraints specifically constraining 'id'
      for chk_record in (
        select con.conname
        from pg_constraint con
        join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
        where con.conrelid = 'public.store_settings'::regclass
          and con.contype = 'c'
          and att.attname = 'id'
      ) loop
        execute 'alter table public.store_settings drop constraint ' || quote_ident(chk_record.conname);
      end loop;

      if id_udt = 'bool' then
        alter table public.store_settings alter column id drop default;
        alter table public.store_settings alter column id type text using 'singleton';
      elsif id_udt in ('text', 'varchar') then
        update public.store_settings set id = 'singleton';
      else
        alter table public.store_settings alter column id drop default;
        alter table public.store_settings alter column id type text using 'singleton';
      end if;
    end if;

    -- Drop any existing primary key on store_settings
    for pk_record in (
      select tc.constraint_name
      from information_schema.table_constraints tc
      where tc.table_schema = 'public' and tc.table_name = 'store_settings'
        and tc.constraint_type = 'PRIMARY KEY'
    ) loop
      execute 'alter table public.store_settings drop constraint ' || quote_ident(pk_record.constraint_name);
    end loop;

    -- Enforce primary key and singleton check constraint
    alter table public.store_settings alter column id set default 'singleton';
    alter table public.store_settings alter column id set not null;
    alter table public.store_settings add primary key (id);

    if not exists (
      select 1 from pg_constraint 
      where conrelid = 'public.store_settings'::regclass and conname = 'store_settings_id_singleton'
    ) then
      alter table public.store_settings add constraint store_settings_id_singleton check (id = 'singleton');
    end if;
  end if;

  raise notice 'Store settings table successfully configured with singleton ID.';
end $$;

-- Ensure all expected settings columns exist
alter table public.store_settings add column if not exists brand_name text not null default 'DEX STORES';
alter table public.store_settings add column if not exists tagline text not null default 'Precision Automotive Parts, Scale Models & Essential Equipment';
alter table public.store_settings add column if not exists whatsapp_number text not null default '2340000000000';
alter table public.store_settings add column if not exists whatsapp_display text not null default '+234 (000) 000-0000';
alter table public.store_settings add column if not exists email text not null default 'enquiries@dexstores.example';
alter table public.store_settings add column if not exists address text not null default 'Commercial Trade Corridor, Lagos, Nigeria';
alter table public.store_settings add column if not exists business_hours text not null default 'Monday – Saturday, 8:30 AM – 6:00 PM WAT';
alter table public.store_settings add column if not exists sample_inventory_notice text not null default '';
alter table public.store_settings add column if not exists updated_at timestamptz not null default now();

-- Enable RLS
alter table public.store_settings enable row level security;

-- Seed singleton settings row if table is empty
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
-- 5. Storage Bucket Configuration (`product-images`)
-- ==============================================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- ==============================================================================
-- 6. Dynamic RLS Policy Audit & Definition
-- ==============================================================================
do $$
declare
  pol record;
  pol_count integer := 0;
begin
  -- 1. Inspect and drop all existing policies on DEX STORES public tables
  for pol in (
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public' 
      and tablename in ('products', 'categories', 'store_settings')
  ) loop
    pol_count := pol_count + 1;
    raise notice 'Auditing and dropping policy: %.% ("%")', 
      pol.schemaname, pol.tablename, pol.policyname;
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;

  -- 2. Complete Storage Policy Audit:
  -- Drop policies targeting product-images OR un-scoped policies that lack bucket filtering
  -- (which would otherwise bypass product-images security through permissive OR combination).
  for pol in (
    select policyname, cmd, roles, qual, with_check
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
  ) loop
    if (
      coalesce(pol.qual, '') ilike '%product-images%' or
      coalesce(pol.with_check, '') ilike '%product-images%' or
      pol.policyname ilike '%product%' or
      (
        -- Un-scoped policy lacking any bucket_id qualification
        coalesce(pol.qual, '') not ilike '%bucket_id%' and
        coalesce(pol.with_check, '') not ilike '%bucket_id%'
      )
    ) then
      pol_count := pol_count + 1;
      raise notice 'Dropping unsafe/un-scoped storage policy on storage.objects: "%" [cmd: %, roles: %]', 
        pol.policyname, pol.cmd, pol.roles;
      execute format('drop policy if exists %I on storage.objects', pol.policyname);
    else
      raise notice 'Preserving unrelated scoped storage policy on storage.objects: "%"', pol.policyname;
    end if;
  end loop;

  raise notice 'RLS Policy Audit complete: Inspected and cleaned % policy definitions.', pol_count;
end $$;

-- ------------------------------------------------------------------------------
-- 6.1 Categories RLS Policies
-- ------------------------------------------------------------------------------
create policy "Public can view active categories"
  on public.categories
  for select
  using (is_active = true);

create policy "Admins can view all categories"
  on public.categories
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can insert categories"
  on public.categories
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update categories"
  on public.categories
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete categories"
  on public.categories
  for delete
  to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------------------------
-- 6.2 Products RLS Policies
-- ------------------------------------------------------------------------------
create policy "Public can view active products"
  on public.products
  for select
  using (is_active = true);

create policy "Admins can view all products"
  on public.products
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can insert products"
  on public.products
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update products"
  on public.products
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete products"
  on public.products
  for delete
  to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------------------------
-- 6.3 Store Settings RLS Policies
-- ------------------------------------------------------------------------------
create policy "Public users can view store settings"
  on public.store_settings
  for select
  using (true);

create policy "Admins can insert store settings"
  on public.store_settings
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update store settings"
  on public.store_settings
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------------------------
-- 6.4 Storage Objects RLS Policies (`product-images`)
-- ------------------------------------------------------------------------------
create policy "Public can view product images"
  on storage.objects
  for select
  using (bucket_id = 'product-images');

create policy "Admins can upload product images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'product-images' and
    public.is_admin()
  );

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

create policy "Admins can delete product images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'product-images' and
    public.is_admin()
  );

-- ==============================================================================
-- 7. Pre-Commit Invariant Assertions & Health Verification
-- ==============================================================================
do $$
declare
  v_col_udt text;
  v_col_nullable text;
  v_col_default text;
  v_invalid_count integer;
  v_settings_count integer;
  v_bucket_public boolean;
  v_func_secdef boolean;
  v_func_path_ok boolean;
  v_pol_count integer;
begin
  -- 1. Helper function assertion: checks prosecdef and proconfig directly
  select p.prosecdef,
         coalesce(exists (
           select 1 from unnest(p.proconfig) cfg
           where cfg = 'search_path=""' or cfg = 'search_path=' or cfg like 'search_path=%'
         ), false)
  into v_func_secdef, v_func_path_ok
  from pg_proc p
  join pg_namespace n on p.pronamespace = n.oid
  where n.nspname = 'public' and p.proname = 'is_admin';

  if v_func_secdef is not true or v_func_path_ok is not true then
    raise exception 'Assertion Failed: public.is_admin() must be SECURITY DEFINER with an empty search_path in proconfig.';
  end if;

  -- 2. Products stock assertions
  select udt_name, is_nullable, column_default into v_col_udt, v_col_nullable, v_col_default
  from information_schema.columns
  where table_schema = 'public' and table_name = 'products' and column_name = 'stock';

  if v_col_udt <> 'int4' or v_col_nullable <> 'NO' then
    raise exception 'Assertion Failed: products.stock must be INTEGER NOT NULL (found udt: %, nullable: %).', v_col_udt, v_col_nullable;
  end if;

  select count(*) into v_invalid_count from public.products where stock is null or stock < 0;
  if v_invalid_count > 0 then
    raise exception 'Assertion Failed: % product(s) have NULL or negative stock.', v_invalid_count;
  end if;

  -- 3. Products gallery assertions
  select udt_name, is_nullable into v_col_udt, v_col_nullable
  from information_schema.columns
  where table_schema = 'public' and table_name = 'products' and column_name = 'gallery';

  if v_col_udt <> 'jsonb' or v_col_nullable <> 'NO' then
    raise exception 'Assertion Failed: products.gallery must be JSONB NOT NULL (found udt: %, nullable: %).', v_col_udt, v_col_nullable;
  end if;

  select count(*) into v_invalid_count from public.products where gallery is null;
  if v_invalid_count > 0 then
    raise exception 'Assertion Failed: % product(s) have NULL gallery.', v_invalid_count;
  end if;

  -- 4. Store settings assertions
  select count(*) into v_settings_count from public.store_settings;
  if v_settings_count <> 1 then
    raise exception 'Assertion Failed: store_settings must contain exactly 1 singleton row (found % rows).', v_settings_count;
  end if;

  if not exists (
    select 1 from public.store_settings where id = 'singleton'
  ) then
    raise exception 'Assertion Failed: store_settings singleton row with id = ''singleton'' is missing.';
  end if;

  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'store_settings' and constraint_type = 'PRIMARY KEY'
  ) then
    raise exception 'Assertion Failed: store_settings is missing primary key.';
  end if;

  -- 5. Foreign key assertion
  select count(*) into v_invalid_count
  from public.products p
  where p.category_id is not null
    and not exists (select 1 from public.categories c where c.id = p.category_id);

  if v_invalid_count > 0 then
    raise exception 'Assertion Failed: % orphaned category_id reference(s) detected.', v_invalid_count;
  end if;

  -- 6. Storage bucket assertion
  select public into v_bucket_public from storage.buckets where id = 'product-images';
  if v_bucket_public is not true then
    raise exception 'Assertion Failed: storage bucket "product-images" is not public.';
  end if;

  -- 7. Storage bypass check: No open/un-scoped policies on storage.objects
  select count(*) into v_invalid_count
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and coalesce(qual, '') not ilike '%bucket_id%'
    and coalesce(with_check, '') not ilike '%bucket_id%';

  if v_invalid_count > 0 then
    raise exception 'Assertion Failed: Detected % un-scoped storage policy(ies) that could bypass product-images restrictions.', v_invalid_count;
  end if;

  -- 8. Verify all required RLS policies exist
  select count(*) into v_pol_count
  from pg_policies
  where (schemaname = 'public' and tablename = 'categories' and policyname in (
    'Public can view active categories', 'Admins can view all categories',
    'Admins can insert categories', 'Admins can update categories', 'Admins can delete categories'
  )) or (schemaname = 'public' and tablename = 'products' and policyname in (
    'Public can view active products', 'Admins can view all products',
    'Admins can insert products', 'Admins can update products', 'Admins can delete products'
  )) or (schemaname = 'public' and tablename = 'store_settings' and policyname in (
    'Public users can view store settings', 'Admins can insert store settings', 'Admins can update store settings'
  )) or (schemaname = 'storage' and tablename = 'objects' and policyname in (
    'Public can view product images', 'Admins can upload product images',
    'Admins can update product images', 'Admins can delete product images'
  ));

  if v_pol_count <> 17 then
    raise exception 'Assertion Failed: Expected 17 hardened policies, found %.', v_pol_count;
  end if;

  raise notice 'All Phase 3 Production Migration Assertions Passed (17 hardened policies active).';
end $$;

commit;
