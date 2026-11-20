-- ==============================================================================
-- DEX STORES — Phase 3 Security & Schema Migration (Production Final Validated)
-- Migration File: supabase/migrations/phase_3_security_migration.sql
-- ==============================================================================
-- Architecture & Data Safety Guarantees:
-- 1. Canonical Stock Column:
--    - Enforces public.products.stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0).
--    - Validates existing numeric, float, bigint, text, and varchar column data.
--    - Rejects fractional inventory (e.g. 10.5) with an explicit migration error.
--    - Rejects out-of-range integer values, negative inventory, NaN and Infinity.
--    - Reconciles 4 possible column presence states (stock_quantity vs stock).
--    - Halts on ambiguous positive conflicting inventory counts without arbitrary guessing.
-- 2. Safe Gallery JSONB Migration (Zero URL/Caption Loss):
--    - Enforces public.products.gallery JSONB NOT NULL DEFAULT '[]'::jsonb.
--    - Converts json, jsonb, text[], varchar[], text, and varchar preserving URLs and captions.
--    - Normalizes temporary column gallery_jsonb (json or jsonb) to jsonb before comparisons.
--    - Preserves existing populated migration data in gallery_jsonb if present.
--    - Rejects malformed or non-array JSON instead of silently clearing data.
--    - Inspects ALL catalog dependencies: views, materialized views, triggers, rules,
--      generated columns, and non-standard pg_depend references.
--    - Verifies every final gallery row is a valid JSON array of objects with URLs.
-- 3. Store Settings Singleton (Zero Data Loss):
--    - Enforces id TEXT PRIMARY KEY DEFAULT 'singleton' CHECK (id = 'singleton').
--    - Compares complete settings configurations across ALL meaningful columns.
--    - Halts with a diagnostic error if conflicting settings rows exist.
--    - Consolidates exact duplicate rows cleanly to leave exactly one singleton row.
-- 4. Complete RLS & Storage Policy Hardening:
--    - Anonymous/public callers can read active products and active categories only.
--    - Verified admins can read all records and perform INSERT, UPDATE, DELETE.
--    - Storage public access is limited to reading from product-images.
--    - Storage upload, update, and delete in product-images are strictly admin-only.
--    - Complete Storage audit: validates strict bucket_id equality patterns in BOTH
--      USING and WITH CHECK for UPDATE/ALL; rejects weak patterns like IS NOT NULL,
--      <>, !=, ANY, NOT, or OR combinations.
--    - Preserves policies belonging to unrelated Storage buckets while eliminating
--      un-scoped, weak, or asymmetric global policies that could bypass product-images security.
-- 5. Hardened Admin Authorization Function:
--    - public.is_admin() configured as SECURITY DEFINER with SET search_path = ''.
--    - Inspects trusted JWT app_metadata (never untrusted user_metadata).
--    - Revoked from public and anon; granted to authenticated only.
-- 6. Orphan Category References:
--    - If products reference non-existent categories, the migration ABORTS with
--      a detailed diagnostic listing every orphaned product, rather than silently
--      nullifying references. The operator must resolve orphans before retrying.
-- 7. Comprehensive Pre-Commit Invariant Assertions:
--    - Validates all invariants before COMMIT, checking exact definitions, defaults,
--      policy clauses, and strict bucket_id equality in storage policies.
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

-- Revoke execute from public and anon, grant to authenticated only
revoke all on function public.is_admin() from public, anon;
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

    if stock_udt in ('numeric', 'decimal', 'float4', 'float8') then
      -- Check for NaN and Infinity in float/numeric columns
      for v_rec in (
        select id, name, stock
        from public.products
        where stock is not null and stock::text in ('NaN', 'Infinity', '-Infinity')
      ) loop
        raise exception 'NaN or Infinity detected in public.products.stock for Product ID % ("%"): value = %. Physical inventory cannot be NaN/Infinity. Aborting.',
          v_rec.id, v_rec.name, v_rec.stock;
      end loop;

      for v_rec in (
        select id, name, stock
        from public.products
        where stock is not null 
          and stock::text not in ('NaN', 'Infinity', '-Infinity')
          and trunc(stock::numeric) <> stock::numeric
      ) loop
        raise exception 'Fractional stock detected in public.products.stock for Product ID % ("%"): value = %. Physical inventory cannot be fractional. Migration aborted.',
          v_rec.id, v_rec.name, v_rec.stock;
      end loop;

      for v_rec in (
        select id, name, stock
        from public.products
        where stock is not null 
          and stock::text not in ('NaN', 'Infinity', '-Infinity')
          and (stock::numeric > 2147483647 or stock::numeric < -2147483648)
      ) loop
        raise exception 'Stock value in public.products.stock exceeds 32-bit integer range for Product ID %: %. Aborting.',
          v_rec.id, v_rec.stock;
      end loop;

      for v_rec in (
        select id, name, stock 
        from public.products 
        where stock is not null 
          and stock::text not in ('NaN', 'Infinity', '-Infinity')
          and stock::numeric < 0
      ) loop
        raise exception 'Negative stock detected in public.products.stock for Product ID % ("%"): stock = %. Physical inventory cannot be negative. Aborting migration.',
          v_rec.id, v_rec.name, v_rec.stock;
      end loop;

      for v_rec in (
        select conname from pg_constraint 
        where conrelid = 'public.products'::regclass and conname like '%stock%'
      ) loop
        execute 'alter table public.products drop constraint ' || quote_ident(v_rec.conname);
      end loop;

      alter table public.products alter column stock drop default;
      alter table public.products alter column stock type integer using stock::numeric::integer;

    elsif stock_udt in ('varchar', 'text') then
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

      for v_rec in (
        select id, name, stock
        from public.products
        where stock is not null and (stock::numeric > 2147483647 or stock::numeric < -2147483648)
      ) loop
        raise exception 'Stock value in public.products.stock exceeds 32-bit integer range for Product ID %: %. Aborting.',
          v_rec.id, v_rec.stock;
      end loop;

      for v_rec in (select id, name, stock from public.products where stock is not null and stock::numeric < 0) loop
        raise exception 'Negative stock detected in public.products.stock for Product ID % ("%"): stock = %. Aborting.',
          v_rec.id, v_rec.name, v_rec.stock;
      end loop;

      alter table public.products alter column stock drop default;
      alter table public.products alter column stock type integer using stock::numeric::integer;

    elsif stock_udt in ('int2', 'int8') then
      for v_rec in (
        select id, name, stock
        from public.products
        where stock is not null and (stock > 2147483647 or stock < -2147483648)
      ) loop
        raise exception 'Stock value in public.products.stock exceeds 32-bit integer range for Product ID %: %. Aborting.',
          v_rec.id, v_rec.stock;
      end loop;

      for v_rec in (select id, name, stock from public.products where stock is not null and stock < 0) loop
        raise exception 'Negative stock detected in public.products.stock for Product ID % ("%"): stock = %. Aborting.',
          v_rec.id, v_rec.name, v_rec.stock;
      end loop;

      alter table public.products alter column stock type integer using stock::integer;

    elsif stock_udt = 'int4' then
      for v_rec in (select id, name, stock from public.products where stock is not null and stock < 0) loop
        raise exception 'Negative stock detected in public.products.stock for Product ID % ("%"): stock = %. Aborting.',
          v_rec.id, v_rec.name, v_rec.stock;
      end loop;

    else
      raise exception 'Unsupported data type "%" on public.products.stock. Safe conversion to integer cannot be performed.', stock_udt;
    end if;
  end if;

  -- Step B: Validate and safely convert data type of 'stock_quantity' if it exists
  if has_stock_qty then
    select udt_name into stock_qty_udt
    from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'stock_quantity';

    if stock_qty_udt in ('numeric', 'decimal', 'float4', 'float8') then
      -- Check for NaN and Infinity in float/numeric columns
      for v_rec in (
        select id, name, stock_quantity
        from public.products
        where stock_quantity is not null and stock_quantity::text in ('NaN', 'Infinity', '-Infinity')
      ) loop
        raise exception 'NaN or Infinity detected in public.products.stock_quantity for Product ID % ("%"): value = %. Aborting.',
          v_rec.id, v_rec.name, v_rec.stock_quantity;
      end loop;

      for v_rec in (
        select id, name, stock_quantity
        from public.products
        where stock_quantity is not null 
          and stock_quantity::text not in ('NaN', 'Infinity', '-Infinity')
          and trunc(stock_quantity::numeric) <> stock_quantity::numeric
      ) loop
        raise exception 'Fractional stock detected in public.products.stock_quantity for Product ID % ("%"): value = %. Aborting.',
          v_rec.id, v_rec.name, v_rec.stock_quantity;
      end loop;

      for v_rec in (
        select id, name, stock_quantity
        from public.products
        where stock_quantity is not null 
          and stock_quantity::text not in ('NaN', 'Infinity', '-Infinity')
          and (stock_quantity::numeric > 2147483647 or stock_quantity::numeric < -2147483648)
      ) loop
        raise exception 'Stock value in public.products.stock_quantity exceeds 32-bit integer range for Product ID %: %. Aborting.',
          v_rec.id, v_rec.stock_quantity;
      end loop;

      for v_rec in (
        select id, name, stock_quantity 
        from public.products 
        where stock_quantity is not null 
          and stock_quantity::text not in ('NaN', 'Infinity', '-Infinity')
          and stock_quantity::numeric < 0
      ) loop
        raise exception 'Negative stock detected in public.products.stock_quantity for Product ID % ("%"): stock_quantity = %. Aborting.',
          v_rec.id, v_rec.name, v_rec.stock_quantity;
      end loop;

      alter table public.products alter column stock_quantity drop default;
      alter table public.products alter column stock_quantity type integer using stock_quantity::numeric::integer;

    elsif stock_qty_udt in ('varchar', 'text') then
      for v_rec in (
        select id, name, stock_quantity
        from public.products
        where stock_quantity is not null and trim(stock_quantity::text) !~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$'
      ) loop
        raise exception 'Non-numeric text found in public.products.stock_quantity for Product ID % ("%"): value = "%". Aborting.',
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

      for v_rec in (
        select id, name, stock_quantity
        from public.products
        where stock_quantity is not null and (stock_quantity::numeric > 2147483647 or stock_quantity::numeric < -2147483648)
      ) loop
        raise exception 'Stock value in public.products.stock_quantity exceeds 32-bit integer range for Product ID %: %. Aborting.',
          v_rec.id, v_rec.stock_quantity;
      end loop;

      for v_rec in (select id, name, stock_quantity from public.products where stock_quantity is not null and stock_quantity::numeric < 0) loop
        raise exception 'Negative stock detected in public.products.stock_quantity for Product ID % ("%"): stock_quantity = %. Aborting.',
          v_rec.id, v_rec.name, v_rec.stock_quantity;
      end loop;

      alter table public.products alter column stock_quantity drop default;
      alter table public.products alter column stock_quantity type integer using stock_quantity::numeric::integer;

    elsif stock_qty_udt in ('int2', 'int8') then
      for v_rec in (
        select id, name, stock_quantity
        from public.products
        where stock_quantity is not null and (stock_quantity > 2147483647 or stock_quantity < -2147483648)
      ) loop
        raise exception 'Stock value in public.products.stock_quantity exceeds 32-bit integer range for Product ID %: %. Aborting.',
          v_rec.id, v_rec.stock_quantity;
      end loop;

      for v_rec in (select id, name, stock_quantity from public.products where stock_quantity is not null and stock_quantity::numeric < 0) loop
        raise exception 'Negative stock detected in public.products.stock_quantity for Product ID % ("%"): stock_quantity = %. Aborting.',
          v_rec.id, v_rec.name, v_rec.stock_quantity;
      end loop;

      alter table public.products alter column stock_quantity type integer using stock_quantity::integer;

    elsif stock_qty_udt = 'int4' then
      for v_rec in (select id, name, stock_quantity from public.products where stock_quantity is not null and stock_quantity::numeric < 0) loop
        raise exception 'Negative stock detected in public.products.stock_quantity for Product ID % ("%"): stock_quantity = %. Aborting.',
          v_rec.id, v_rec.name, v_rec.stock_quantity;
      end loop;

    else
      raise exception 'Unsupported data type "%" on public.products.stock_quantity.', stock_qty_udt;
    end if;
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
    -- Check for conflicting positive values
    select count(*) into conflict_count
    from public.products
    where stock is not null 
      and stock_quantity is not null 
      and stock > 0 
      and stock_quantity > 0 
      and stock <> stock_quantity;

    if conflict_count > 0 then
      for v_rec in (
        select id, name, stock, stock_quantity
        from public.products
        where stock is not null and stock_quantity is not null and stock > 0 and stock_quantity > 0 and stock <> stock_quantity
      ) loop
        raise exception 'Ambiguous stock conflict detected: Product ID % ("%") has stock = % and stock_quantity = %. Cannot arbitrarily choose between conflicting positive inventory counts. Migration aborted.',
          v_rec.id, v_rec.name, v_rec.stock, v_rec.stock_quantity;
      end loop;
    end if;

    -- Reconciliation rule: prefer the populated/non-zero value
    -- When both are NULL, default to 0
    -- When both are 0, keep 0
    -- When one is populated and the other is NULL or 0, take the populated value
    -- Conflicting positive values already aborted above
    update public.products
    set stock = case
      when stock is null and stock_quantity is null then 0
      when stock is null then stock_quantity
      when stock_quantity is null then stock
      when stock = 0 and stock_quantity > 0 then stock_quantity
      else stock
    end;

    update public.products
    set stock_quantity = stock
    where stock_quantity is distinct from stock;

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
-- 3.2 Gallery Migration (Supporting json, jsonb, text[], varchar[], text, varchar)
-- ------------------------------------------------------------------------------
-- Create temporary normalization functions for the migration transaction
create or replace function pg_temp.dex_normalize_gallery_jsonb(v jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  elem jsonb;
  res jsonb := '[]'::jsonb;
begin
  if v is null or v = 'null'::jsonb then
    return '[]'::jsonb;
  end if;

  -- Single URL string: wrap into standard object array
  if jsonb_typeof(v) = 'string' then
    if trim(v #>> '{}') <> '' then
      return jsonb_build_array(jsonb_build_object('url', trim(v #>> '{}'), 'caption', ''));
    else
      return '[]'::jsonb;
    end if;
  end if;

  -- Single object: ensure url exists, preserve caption if present
  if jsonb_typeof(v) = 'object' then
    if v ? 'url' and trim(v->>'url') <> '' then
      return jsonb_build_array(jsonb_build_object('url', trim(v->>'url'), 'caption', coalesce(v->>'caption', '')));
    else
      raise exception 'JSON object in gallery missing "url" property: %', v;
    end if;
  end if;

  -- Array of items: normalize each element (strings or objects)
  if jsonb_typeof(v) = 'array' then
    for elem in select * from jsonb_array_elements(v) loop
      if jsonb_typeof(elem) = 'string' then
        if trim(elem #>> '{}') <> '' then
          res := res || jsonb_build_object('url', trim(elem #>> '{}'), 'caption', '');
        end if;
      elsif jsonb_typeof(elem) = 'object' then
        if elem ? 'url' and trim(elem->>'url') <> '' then
          res := res || jsonb_build_object('url', trim(elem->>'url'), 'caption', coalesce(elem->>'caption', ''));
        else
          raise exception 'JSON object in gallery array missing "url" property: %', elem;
        end if;
      else
        raise exception 'Unsupported element in gallery array (expected string or object): %', elem;
      end if;
    end loop;
    return res;
  end if;

  raise exception 'Unsupported JSON type for gallery: %', jsonb_typeof(v);
end $$;

create or replace function pg_temp.dex_convert_text_array_to_jsonb(arr text[])
returns jsonb
language plpgsql
immutable
as $$
declare
  u text;
  res jsonb := '[]'::jsonb;
begin
  if arr is null then
    return '[]'::jsonb;
  end if;
  foreach u in array arr loop
    if u is not null and trim(u) <> '' then
      res := res || jsonb_build_object('url', trim(u), 'caption', '');
    end if;
  end loop;
  return res;
end $$;

create or replace function pg_temp.dex_convert_text_to_jsonb(val text)
returns jsonb
language plpgsql
immutable
as $$
begin
  if val is null or trim(val) = '' then
    return '[]'::jsonb;
  end if;
  if substring(trim(val) from 1 for 1) in ('[', '{') then
    begin
      return pg_temp.dex_normalize_gallery_jsonb(val::jsonb);
    exception when others then
      raise exception 'Malformed JSON in text gallery: %', val;
    end;
  else
    return jsonb_build_array(jsonb_build_object('url', trim(val), 'caption', ''));
  end if;
end $$;

do $$
declare
  col_udt text;
  temp_udt text;
  has_temp_col boolean;
  temp_data_count integer := 0;
  v_dep_views text;
  v_dep_triggers text;
  v_dep_rules text;
  v_dep_other text;
  v_idx record;
  v_chk record;
begin
  select udt_name into col_udt
  from information_schema.columns
  where table_schema = 'public' and table_name = 'products' and column_name = 'gallery';

  -- 1. Inspect dependent views and materialized views via pg_depend
  select string_agg(format('%I.%I (%s)', n.nspname, c.relname, case c.relkind when 'v' then 'view' when 'm' then 'materialized view' end), ', ')
  into v_dep_views
  from pg_depend d
  join pg_rewrite r on r.oid = d.objid
  join pg_class c on c.oid = r.ev_class
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = d.refobjid and a.attnum = d.refobjsubid
  where d.refobjid = 'public.products'::regclass
    and a.attname = 'gallery'
    and c.relkind in ('v', 'm');

  if v_dep_views is not null and v_dep_views <> '' then
    raise exception 'Cannot migrate public.products.gallery: dependent view(s) detected: %. Please drop or update dependent view(s) before applying migration.', v_dep_views;
  end if;

  -- 2. Inspect dependent triggers on public.products referencing gallery
  select string_agg(t.tgname, ', ')
  into v_dep_triggers
  from pg_trigger t
  where t.tgrelid = 'public.products'::regclass
    and not t.tgisinternal
    and (
      (select attnum from pg_attribute where attrelid = 'public.products'::regclass and attname = 'gallery') = any(t.tgattr)
      or pg_get_triggerdef(t.oid) ilike '%gallery%'
    );

  if v_dep_triggers is not null and v_dep_triggers <> '' then
    raise exception 'Cannot migrate public.products.gallery: dependent trigger(s) detected: %. Please review trigger(s) before applying migration.', v_dep_triggers;
  end if;

  -- 3. Inspect dependent rules on public.products referencing gallery
  select string_agg(r.rulename, ', ')
  into v_dep_rules
  from pg_rewrite r
  where r.ev_class = 'public.products'::regclass
    and r.rulename <> '_RETURN'
    and pg_get_ruledef(r.oid) ilike '%gallery%';

  if v_dep_rules is not null and v_dep_rules <> '' then
    raise exception 'Cannot migrate public.products.gallery: dependent rule(s) detected: %. Please drop or update rule(s) before applying migration.', v_dep_rules;
  end if;

  -- 4. Check for any other pg_depend references on the gallery column
  select string_agg(
    format('deptype=%s classid=%s objid=%s', d.deptype, d.classid::regclass::text, d.objid),
    '; '
  )
  into v_dep_other
  from pg_depend d
  join pg_attribute a on a.attrelid = d.refobjid and a.attnum = d.refobjsubid
  where d.refobjid = 'public.products'::regclass
    and a.attname = 'gallery'
    and d.deptype not in ('i', 'a')  -- not internal/auto
    and d.classid not in (
      (select oid from pg_class where relname = 'pg_rewrite'),
      (select oid from pg_class where relname = 'pg_trigger'),
      (select oid from pg_class where relname = 'pg_constraint'),
      (select oid from pg_class where relname = 'pg_attrdef')
    );

  if v_dep_other is not null and v_dep_other <> '' then
    raise exception 'Cannot migrate public.products.gallery: unexpected catalog dependencies detected: %. Please inspect and resolve before applying migration.', v_dep_other;
  end if;

  -- 5. Drop check constraints specifically on gallery
  for v_chk in (
    select con.conname
    from pg_constraint con
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
    where con.conrelid = 'public.products'::regclass
      and con.contype = 'c'
      and att.attname = 'gallery'
  ) loop
    raise notice 'Dropping check constraint % on products.gallery prior to type conversion.', v_chk.conname;
    execute 'alter table public.products drop constraint ' || quote_ident(v_chk.conname);
  end loop;

  -- 6. Drop standalone secondary indexes on gallery (preserving constraint-owned indexes)
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

  -- 7. Check if gallery_jsonb exists from a previous aborted migration
  select exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'products' and column_name = 'gallery_jsonb'
  ) into has_temp_col;

  if has_temp_col then
    select udt_name into temp_udt
    from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'gallery_jsonb';

    if temp_udt not in ('jsonb', 'json') then
      raise exception 'Existing column public.products.gallery_jsonb has unexpected udt_name "%" (expected jsonb or json). Aborting migration.', temp_udt;
    end if;

    -- Normalize temporary column to jsonb consistently (FIX Issue 1)
    if temp_udt = 'json' then
      raise notice 'Converting gallery_jsonb from json to jsonb for consistent processing.';
      alter table public.products alter column gallery_jsonb type jsonb using gallery_jsonb::jsonb;
    end if;

    -- Normalize existing gallery_jsonb data (guaranteed to be jsonb)
    update public.products
    set gallery_jsonb = pg_temp.dex_normalize_gallery_jsonb(gallery_jsonb)
    where gallery_jsonb is not null;

    select count(*) into temp_data_count
    from public.products
    where gallery_jsonb is not null and gallery_jsonb <> '[]'::jsonb;

    if temp_data_count > 0 then
      raise notice 'Preserving % populated row(s) from existing gallery_jsonb column.', temp_data_count;
    end if;
  end if;

  -- 8. Perform conversion according to existing column udt_name
  if col_udt = 'jsonb' then
    raise notice 'public.products.gallery is JSONB (udt_name = jsonb). Normalizing array items.';
    update public.products
    set gallery = pg_temp.dex_normalize_gallery_jsonb(gallery)
    where gallery is not null;

  elsif col_udt = 'json' then
    raise notice 'public.products.gallery is JSON (udt_name = json). Converting to JSONB and normalizing items.';
    alter table public.products alter column gallery drop default;
    alter table public.products alter column gallery type jsonb using pg_temp.dex_normalize_gallery_jsonb(gallery::jsonb);

  elsif col_udt in ('_text', '_varchar') then
    raise notice 'public.products.gallery is array of text (udt_name = %). Converting to JSONB.', col_udt;
    alter table public.products alter column gallery drop default;
    alter table public.products alter column gallery type jsonb using pg_temp.dex_convert_text_array_to_jsonb(gallery::text[]);

  elsif col_udt in ('text', 'varchar') then
    raise notice 'public.products.gallery is string (udt_name = %). Converting to JSONB.', col_udt;
    alter table public.products alter column gallery drop default;
    alter table public.products alter column gallery type jsonb using pg_temp.dex_convert_text_to_jsonb(gallery::text);

  elsif col_udt is null then
    raise notice 'public.products.gallery does not exist. Creating as JSONB.';
    alter table public.products add column gallery jsonb not null default '[]'::jsonb;

  else
    raise exception 'Unsupported data type "%" on public.products.gallery. Safe conversion cannot be performed.', col_udt;
  end if;

  -- If gallery_jsonb was present and populated, preserve its populated entries
  if has_temp_col and temp_data_count > 0 then
    update public.products
    set gallery = gallery_jsonb
    where gallery_jsonb is not null and gallery_jsonb <> '[]'::jsonb;
    
    -- Drop temporary column safely after merge
    alter table public.products drop column gallery_jsonb;
  elsif has_temp_col then
    alter table public.products drop column gallery_jsonb;
  end if;

  -- Enforce NOT NULL and default '[]'::jsonb
  update public.products set gallery = '[]'::jsonb where gallery is null;
  alter table public.products alter column gallery set default '[]'::jsonb;
  alter table public.products alter column gallery set not null;

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
-- 3.4 Foreign Key Validation & Orphan Detection (ABORT, never auto-cleanup)
-- ------------------------------------------------------------------------------
do $$
declare
  fk_record record;
  orphan_count integer := 0;
  orphan_rec record;
  orphan_details text := '';
begin
  select count(*) into orphan_count
  from public.products p
  where p.category_id is not null
    and not exists (
      select 1 from public.categories c where c.id = p.category_id
    );

  if orphan_count > 0 then
    -- Build detailed diagnostic listing of every orphaned product
    for orphan_rec in (
      select p.id, p.name, p.category_id
      from public.products p
      where p.category_id is not null
        and not exists (select 1 from public.categories c where c.id = p.category_id)
    ) loop
      orphan_details := orphan_details || format(
        E'\n  - Product ID: %s, Name: "%s", Missing category_id: %s',
        orphan_rec.id, orphan_rec.name, orphan_rec.category_id
      );
    end loop;

    raise exception E'Foreign Key Violation: % product(s) reference non-existent category_id values. The migration cannot silently nullify category references — this requires explicit operator resolution.\n\nOrphaned products:%\n\nResolution: Either create the missing categories, reassign these products to valid categories, or set their category_id to NULL manually before retrying the migration.',
      orphan_count, orphan_details;
  end if;

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
      id text primary key default 'singleton' constraint store_settings_id_singleton check (id = 'singleton'),
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

    if row_count > 1 then
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

    for pk_record in (
      select tc.constraint_name
      from information_schema.table_constraints tc
      where tc.table_schema = 'public' and tc.table_name = 'store_settings'
        and tc.constraint_type = 'PRIMARY KEY'
    ) loop
      execute 'alter table public.store_settings drop constraint ' || quote_ident(pk_record.constraint_name);
    end loop;

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

-- Helper function for strict bucket_id equality validation (FIX Issue 2)
-- Returns true ONLY if the expression contains a strict equality comparison
-- like: bucket_id = 'some-bucket-name'
-- Rejects weak patterns: bucket_id IS NOT NULL, bucket_id <>, bucket_id !=,
-- bucket_id = ANY(...), NOT (...), or OR combinations.
create or replace function pg_temp.dex_has_strict_bucket_equality(expr text)
returns boolean
language plpgsql
immutable
as $$
declare
  cleaned text;
begin
  if expr is null or trim(expr) = '' then
    return false;
  end if;

  cleaned := lower(trim(expr));

  -- Reject weak or negative patterns
  if cleaned ~ 'bucket_id\s+is\s+not\s+null' or
     cleaned ~ 'bucket_id\s*<>' or
     cleaned ~ 'bucket_id\s*!=' or
     cleaned ~ 'bucket_id\s*=\s*any' or
     cleaned ~ 'not\s*\(' or
     cleaned ~ '\s+or\s+' then
    return false;
  end if;

  -- Must contain bucket_id = '<literal>' pattern (with single quotes around the bucket name)
  if cleaned ~ 'bucket_id\s*=\s*''[a-z0-9_-]+''' then
    return true;
  end if;

  return false;
end $$;

do $$
declare
  pol record;
  pol_count integer := 0;
  is_unsafe boolean;
  qual_ok boolean;
  wc_ok boolean;
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

  -- 2. Complete Storage Policy Audit (FIX Issue 2):
  -- Validate strict bucket_id equality patterns, not just presence of "bucket_id"
  for pol in (
    select policyname, cmd, roles, qual, with_check
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
  ) loop
    is_unsafe := false;

    -- A. Any policy specifically targeting or naming product-images/products
    if coalesce(pol.qual, '') ilike '%product-images%' or
       coalesce(pol.with_check, '') ilike '%product-images%' or
       pol.policyname ilike '%product%' then
      is_unsafe := true;

    -- B. Validate strict bucket_id equality according to command type:
    elsif pol.cmd = 'SELECT' then
      -- SELECT needs strict bucket_id equality in USING (qual)
      qual_ok := pg_temp.dex_has_strict_bucket_equality(pol.qual);
      if not qual_ok then
        is_unsafe := true;
      end if;

    elsif pol.cmd = 'INSERT' then
      -- INSERT needs strict bucket_id equality in WITH CHECK
      wc_ok := pg_temp.dex_has_strict_bucket_equality(pol.with_check);
      if not wc_ok then
        is_unsafe := true;
      end if;

    elsif pol.cmd = 'DELETE' then
      -- DELETE needs strict bucket_id equality in USING (qual)
      qual_ok := pg_temp.dex_has_strict_bucket_equality(pol.qual);
      if not qual_ok then
        is_unsafe := true;
      end if;

    elsif pol.cmd in ('UPDATE', 'ALL') then
      -- UPDATE and ALL need strict bucket_id equality in BOTH USING AND WITH CHECK
      qual_ok := pg_temp.dex_has_strict_bucket_equality(pol.qual);
      wc_ok := pg_temp.dex_has_strict_bucket_equality(pol.with_check);
      if not qual_ok or not wc_ok then
        is_unsafe := true;
      end if;

    else
      -- Unknown command: require strict bucket_id in both
      qual_ok := pg_temp.dex_has_strict_bucket_equality(pol.qual);
      wc_ok := pg_temp.dex_has_strict_bucket_equality(pol.with_check);
      if not qual_ok or not wc_ok then
        is_unsafe := true;
      end if;
    end if;

    if is_unsafe then
      pol_count := pol_count + 1;
      raise notice 'Dropping unsafe/un-scoped storage policy on storage.objects: "%" [cmd: %, roles: %, qual: %, with_check: %]', 
        pol.policyname, pol.cmd, pol.roles, coalesce(pol.qual, '<null>'), coalesce(pol.with_check, '<null>');
      execute format('drop policy if exists %I on storage.objects', pol.policyname);
    else
      raise notice 'Preserving properly-scoped storage policy on storage.objects: "%" [cmd: %]', 
        pol.policyname, pol.cmd;
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
  v_chk_def text;
  v_invalid_count integer;
  v_settings_count integer;
  v_bucket_public boolean;
  v_func_secdef boolean;
  v_func_path_ok boolean;
  v_pol record;
  v_matched integer;
  v_weak_pol record;
begin
  -- 1. Helper function assertion: checks prosecdef, proconfig, and privileges
  select p.prosecdef,
         coalesce(exists (
           select 1 from unnest(p.proconfig) cfg
           where cfg in ('search_path=""', 'search_path=')
         ), false)
  into v_func_secdef, v_func_path_ok
  from pg_proc p
  join pg_namespace n on p.pronamespace = n.oid
  where n.nspname = 'public' and p.proname = 'is_admin';

  if v_func_secdef is not true or v_func_path_ok is not true then
    raise exception 'Assertion Failed: public.is_admin() must be SECURITY DEFINER with an empty search_path in proconfig.';
  end if;

  if has_function_privilege('anon', 'public.is_admin()', 'execute') then
    raise exception 'Assertion Failed: public.is_admin() must NOT be executable by anon.';
  end if;

  if not has_function_privilege('authenticated', 'public.is_admin()', 'execute') then
    raise exception 'Assertion Failed: public.is_admin() must be executable by authenticated.';
  end if;

  -- 2. Products stock assertions
  select udt_name, is_nullable, column_default into v_col_udt, v_col_nullable, v_col_default
  from information_schema.columns
  where table_schema = 'public' and table_name = 'products' and column_name = 'stock';

  if v_col_udt <> 'int4' or v_col_nullable <> 'NO' then
    raise exception 'Assertion Failed: products.stock must be INTEGER NOT NULL (found udt: %, nullable: %).', v_col_udt, v_col_nullable;
  end if;

  if v_col_default not in ('0', '0::integer') and v_col_default not like '0%' then
    raise exception 'Assertion Failed: products.stock default must be 0 (found: %).', v_col_default;
  end if;

  select count(*) into v_invalid_count from public.products where stock is null or stock < 0;
  if v_invalid_count > 0 then
    raise exception 'Assertion Failed: % product(s) have NULL or negative stock.', v_invalid_count;
  end if;

  select pg_get_constraintdef(oid) into v_chk_def
  from pg_constraint
  where conrelid = 'public.products'::regclass and conname = 'products_stock_check';

  if v_chk_def is null or v_chk_def not ilike '%(stock >= 0)%' then
    raise exception 'Assertion Failed: products_stock_check constraint missing or definition mismatch: %', v_chk_def;
  end if;

  -- 3. Products gallery assertions
  select udt_name, is_nullable, column_default into v_col_udt, v_col_nullable, v_col_default
  from information_schema.columns
  where table_schema = 'public' and table_name = 'products' and column_name = 'gallery';

  if v_col_udt <> 'jsonb' or v_col_nullable <> 'NO' then
    raise exception 'Assertion Failed: products.gallery must be JSONB NOT NULL (found udt: %, nullable: %).', v_col_udt, v_col_nullable;
  end if;

  if v_col_default not ilike '%[]%::jsonb%' and v_col_default not in ('''[]''::jsonb', '[]'::text, '''[]''') then
    raise exception 'Assertion Failed: products.gallery default must be []::jsonb (found: %).', v_col_default;
  end if;

  select count(*) into v_invalid_count from public.products where gallery is null or jsonb_typeof(gallery) <> 'array';
  if v_invalid_count > 0 then
    raise exception 'Assertion Failed: % product(s) have NULL or non-array gallery.', v_invalid_count;
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

  select pg_get_constraintdef(oid) into v_chk_def
  from pg_constraint
  where conrelid = 'public.store_settings'::regclass and conname = 'store_settings_id_singleton';

  if v_chk_def is null or (v_chk_def not ilike '%(id = ''singleton''::text)%' and v_chk_def not ilike '%id = ''singleton''%') then
    raise exception 'Assertion Failed: store_settings_id_singleton constraint definition mismatch: %', v_chk_def;
  end if;

  if not exists (
    select 1 from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.constraint_schema = kcu.constraint_schema
     and tc.table_schema = kcu.table_schema
     and tc.table_name = kcu.table_name
    where tc.table_schema = 'public' and tc.table_name = 'store_settings'
      and tc.constraint_type = 'PRIMARY KEY' and kcu.column_name = 'id'
  ) then
    raise exception 'Assertion Failed: store_settings primary key is not specifically on column "id".';
  end if;

  -- 5. Foreign key assertion
  select count(*) into v_invalid_count
  from public.products p
  where p.category_id is not null
    and not exists (select 1 from public.categories c where c.id = p.category_id);

  if v_invalid_count > 0 then
    raise exception 'Assertion Failed: % orphaned category_id reference(s) detected.', v_invalid_count;
  end if;

  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'products' and constraint_name = 'products_category_id_fkey'
  ) then
    raise exception 'Assertion Failed: products_category_id_fkey constraint is missing.';
  end if;

  -- 6. Storage bucket assertion
  select public into v_bucket_public from storage.buckets where id = 'product-images';
  if v_bucket_public is not true then
    raise exception 'Assertion Failed: storage bucket "product-images" is not public.';
  end if;

  -- 7. Storage bypass check: Strict bucket_id equality validation (FIX Issue 2)
  -- Every storage.objects policy must have strict bucket_id = '<literal>' patterns
  for v_weak_pol in (
    select policyname, cmd, qual, with_check
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
  ) loop
    if v_weak_pol.cmd in ('SELECT', 'DELETE') then
      if not pg_temp.dex_has_strict_bucket_equality(v_weak_pol.qual) then
        raise exception 'Assertion Failed: Storage policy "%" (cmd: %) has qual without strict bucket_id equality: %',
          v_weak_pol.policyname, v_weak_pol.cmd, coalesce(v_weak_pol.qual, '<null>');
      end if;
    elsif v_weak_pol.cmd = 'INSERT' then
      if not pg_temp.dex_has_strict_bucket_equality(v_weak_pol.with_check) then
        raise exception 'Assertion Failed: Storage policy "%" (cmd: INSERT) has with_check without strict bucket_id equality: %',
          v_weak_pol.policyname, coalesce(v_weak_pol.with_check, '<null>');
      end if;
    elsif v_weak_pol.cmd in ('UPDATE', 'ALL') then
      if not pg_temp.dex_has_strict_bucket_equality(v_weak_pol.qual) then
        raise exception 'Assertion Failed: Storage policy "%" (cmd: %) has qual without strict bucket_id equality: %',
          v_weak_pol.policyname, v_weak_pol.cmd, coalesce(v_weak_pol.qual, '<null>');
      end if;
      if not pg_temp.dex_has_strict_bucket_equality(v_weak_pol.with_check) then
        raise exception 'Assertion Failed: Storage policy "%" (cmd: %) has with_check without strict bucket_id equality: %',
          v_weak_pol.policyname, v_weak_pol.cmd, coalesce(v_weak_pol.with_check, '<null>');
      end if;
    end if;
  end loop;

  -- 8. Verify EVERY policy definition explicitly (cmd, roles, qual, with_check)
  -- A. Categories (5 policies)
  select count(*) into v_matched from pg_policies
  where schemaname = 'public' and tablename = 'categories'
    and policyname = 'Public can view active categories' and cmd = 'SELECT' and 'public' = any(roles)
    and qual ilike '%is_active = true%';
  if v_matched <> 1 then raise exception 'Assertion Failed: Missing or invalid policy "Public can view active categories".'; end if;

  select count(*) into v_matched from pg_policies
  where schemaname = 'public' and tablename = 'categories'
    and policyname = 'Admins can view all categories' and cmd = 'SELECT' and 'authenticated' = any(roles)
    and qual ilike '%is_admin()%';
  if v_matched <> 1 then raise exception 'Assertion Failed: Missing or invalid policy "Admins can view all categories".'; end if;

  select count(*) into v_matched from pg_policies
  where schemaname = 'public' and tablename = 'categories'
    and policyname = 'Admins can insert categories' and cmd = 'INSERT' and 'authenticated' = any(roles)
    and with_check ilike '%is_admin()%';
  if v_matched <> 1 then raise exception 'Assertion Failed: Missing or invalid policy "Admins can insert categories".'; end if;

  select count(*) into v_matched from pg_policies
  where schemaname = 'public' and tablename = 'categories'
    and policyname = 'Admins can update categories' and cmd = 'UPDATE' and 'authenticated' = any(roles)
    and qual ilike '%is_admin()%' and with_check ilike '%is_admin()%';
  if v_matched <> 1 then raise exception 'Assertion Failed: Missing or invalid policy "Admins can update categories".'; end if;

  select count(*) into v_matched from pg_policies
  where schemaname = 'public' and tablename = 'categories'
    and policyname = 'Admins can delete categories' and cmd = 'DELETE' and 'authenticated' = any(roles)
    and qual ilike '%is_admin()%';
  if v_matched <> 1 then raise exception 'Assertion Failed: Missing or invalid policy "Admins can delete categories".'; end if;

  -- B. Products (5 policies)
  select count(*) into v_matched from pg_policies
  where schemaname = 'public' and tablename = 'products'
    and policyname = 'Public can view active products' and cmd = 'SELECT' and 'public' = any(roles)
    and qual ilike '%is_active = true%';
  if v_matched <> 1 then raise exception 'Assertion Failed: Missing or invalid policy "Public can view active products".'; end if;

  select count(*) into v_matched from pg_policies
  where schemaname = 'public' and tablename = 'products'
    and policyname = 'Admins can view all products' and cmd = 'SELECT' and 'authenticated' = any(roles)
    and qual ilike '%is_admin()%';
  if v_matched <> 1 then raise exception 'Assertion Failed: Missing or invalid policy "Admins can view all products".'; end if;

  select count(*) into v_matched from pg_policies
  where schemaname = 'public' and tablename = 'products'
    and policyname = 'Admins can insert products' and cmd = 'INSERT' and 'authenticated' = any(roles)
    and with_check ilike '%is_admin()%';
  if v_matched <> 1 then raise exception 'Assertion Failed: Missing or invalid policy "Admins can insert products".'; end if;

  select count(*) into v_matched from pg_policies
  where schemaname = 'public' and tablename = 'products'
    and policyname = 'Admins can update products' and cmd = 'UPDATE' and 'authenticated' = any(roles)
    and qual ilike '%is_admin()%' and with_check ilike '%is_admin()%';
  if v_matched <> 1 then raise exception 'Assertion Failed: Missing or invalid policy "Admins can update products".'; end if;

  select count(*) into v_matched from pg_policies
  where schemaname = 'public' and tablename = 'products'
    and policyname = 'Admins can delete products' and cmd = 'DELETE' and 'authenticated' = any(roles)
    and qual ilike '%is_admin()%';
  if v_matched <> 1 then raise exception 'Assertion Failed: Missing or invalid policy "Admins can delete products".'; end if;

  -- C. Store Settings (3 policies)
  select count(*) into v_matched from pg_policies
  where schemaname = 'public' and tablename = 'store_settings'
    and policyname = 'Public users can view store settings' and cmd = 'SELECT' and 'public' = any(roles)
    and qual = 'true';
  if v_matched <> 1 then raise exception 'Assertion Failed: Missing or invalid policy "Public users can view store settings".'; end if;

  select count(*) into v_matched from pg_policies
  where schemaname = 'public' and tablename = 'store_settings'
    and policyname = 'Admins can insert store settings' and cmd = 'INSERT' and 'authenticated' = any(roles)
    and with_check ilike '%is_admin()%';
  if v_matched <> 1 then raise exception 'Assertion Failed: Missing or invalid policy "Admins can insert store settings".'; end if;

  select count(*) into v_matched from pg_policies
  where schemaname = 'public' and tablename = 'store_settings'
    and policyname = 'Admins can update store settings' and cmd = 'UPDATE' and 'authenticated' = any(roles)
    and qual ilike '%is_admin()%' and with_check ilike '%is_admin()%';
  if v_matched <> 1 then raise exception 'Assertion Failed: Missing or invalid policy "Admins can update store settings".'; end if;

  -- D. Storage Objects (4 policies on product-images)
  select count(*) into v_matched from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Public can view product images' and cmd = 'SELECT' and 'public' = any(roles)
    and qual ilike '%bucket_id = ''product-images''%';
  if v_matched <> 1 then raise exception 'Assertion Failed: Missing or invalid policy "Public can view product images".'; end if;

  select count(*) into v_matched from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Admins can upload product images' and cmd = 'INSERT' and 'authenticated' = any(roles)
    and with_check ilike '%bucket_id = ''product-images''%' and with_check ilike '%is_admin()%';
  if v_matched <> 1 then raise exception 'Assertion Failed: Missing or invalid policy "Admins can upload product images".'; end if;

  select count(*) into v_matched from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Admins can update product images' and cmd = 'UPDATE' and 'authenticated' = any(roles)
    and qual ilike '%bucket_id = ''product-images''%' and qual ilike '%is_admin()%'
    and with_check ilike '%bucket_id = ''product-images''%' and with_check ilike '%is_admin()%';
  if v_matched <> 1 then raise exception 'Assertion Failed: Missing or invalid policy "Admins can update product images".'; end if;

  select count(*) into v_matched from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Admins can delete product images' and cmd = 'DELETE' and 'authenticated' = any(roles)
    and qual ilike '%bucket_id = ''product-images''%' and qual ilike '%is_admin()%';
  if v_matched <> 1 then raise exception 'Assertion Failed: Missing or invalid policy "Admins can delete product images".'; end if;

  raise notice 'All Phase 3 Production Migration Assertions Passed (all 17 hardened policy definitions verified).';
end $$;

commit;
