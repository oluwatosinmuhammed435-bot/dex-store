import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const INIT_SQL = fs.readFileSync(
  path.join(process.cwd(), 'supabase', 'migrations', 'initialize_store_settings.sql'),
  'utf-8'
);

async function bootstrapPglite(db: PGlite) {
  await db.exec(`
    do $$
    begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon nologin;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin;
      end if;
    end $$;

    create schema if not exists auth;
    create schema if not exists storage;

    create or replace function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
    $$;

    create table if not exists storage.buckets (
      id text primary key,
      name text not null,
      owner uuid,
      created_at timestamptz default now(),
      updated_at timestamptz default now(),
      public boolean default false
    );

    create table if not exists storage.objects (
      id uuid primary key default gen_random_uuid(),
      bucket_id text references storage.buckets(id),
      name text,
      owner uuid,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    alter table storage.objects enable row level security;
  `);
}

test('initialize_store_settings.sql idempotently initializes boolean-id live schema without seeding fake inventory', async () => {
  const db = new PGlite();
  await bootstrapPglite(db);

  await db.exec(`
    create table public.categories (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      slug text unique not null,
      image_url text,
      is_active boolean not null default true,
      created_at timestamptz not null default now()
    );

    create table public.products (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      slug text unique not null,
      reference text unique not null,
      category_id uuid references public.categories(id),
      price_ngn numeric not null default 0,
      stock_quantity integer not null default 0,
      availability text not null default 'In Stock',
      featured boolean not null default false,
      description text,
      image_url text,
      gallery text[] not null default '{}',
      specifications jsonb not null default '{}'::jsonb,
      is_active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table public.store_settings (
      id boolean primary key default true,
      brand_name text not null,
      tagline text not null default '',
      whatsapp_number text not null default '',
      email text not null default '',
      address text not null default '',
      business_hours jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now()
    );
  `);

  await db.exec(INIT_SQL);

  const settingsRes = await db.query<{
    id: boolean;
    brand_name: string;
    business_hours: { display: string };
  }>('select id, brand_name, business_hours from public.store_settings');
  assert.equal(settingsRes.rows.length, 1);
  assert.equal(settingsRes.rows[0].id, true);
  assert.equal(settingsRes.rows[0].brand_name, 'DEX STORES');
  assert.ok(settingsRes.rows[0].business_hours.display);

  // Confirm ZERO fake products or categories were inserted
  const prodCount = await db.query<{ count: string }>('select count(*)::text as count from public.products');
  const catCount = await db.query<{ count: string }>('select count(*)::text as count from public.categories');
  assert.equal(prodCount.rows[0].count, '0');
  assert.equal(catCount.rows[0].count, '0');

  // Confirm bucket created as public
  const bucketRes = await db.query<{ id: string; public: boolean }>(
    "select id, public from storage.buckets where id = 'product-images'"
  );
  assert.equal(bucketRes.rows.length, 1);
  assert.equal(bucketRes.rows[0].public, true);

  // Modify settings and re-run initialization script to confirm idempotency
  await db.exec(`update public.store_settings set brand_name = 'DEX CUSTOM' where id = true;`);
  await db.exec(INIT_SQL);

  const afterRerun = await db.query<{ brand_name: string }>(
    'select brand_name from public.store_settings'
  );
  assert.equal(afterRerun.rows.length, 1);
  assert.equal(afterRerun.rows[0].brand_name, 'DEX CUSTOM');

  await db.close();
});

test('initialize_store_settings.sql enforces app_metadata-only admin authorization in public.is_admin() and RLS', async () => {
  const db = new PGlite();
  await bootstrapPglite(db);

  await db.exec(`
    create table public.store_settings (
      id text primary key default 'singleton',
      brand_name text not null,
      tagline text not null default '',
      whatsapp_number text not null default '',
      email text not null default '',
      address text not null default '',
      business_hours text not null default '',
      updated_at timestamptz not null default now()
    );
  `);

  await db.exec(INIT_SQL);

  const textRow = await db.query<{ id: string }>('select id from public.store_settings');
  assert.equal(textRow.rows.length, 1);
  assert.equal(textRow.rows[0].id, 'singleton');

  // Check admin JWT variations
  for (const claims of [
    JSON.stringify({ role: 'authenticated', app_metadata: { role: 'admin' }, user_metadata: {} }),
    JSON.stringify({ role: 'authenticated', app_metadata: { role: 'Admin' }, user_metadata: {} }),
    JSON.stringify({ role: 'authenticated', app_metadata: { roles: ['admin'] }, user_metadata: {} }),
    JSON.stringify({ role: 'authenticated', app_metadata: { is_admin: true }, user_metadata: {} }),
  ]) {
    await db.exec(`select set_config('request.jwt.claims', '${claims.replace(/'/g, "''")}', false);`);
    const res = await db.query<{ ok: boolean }>('select public.is_admin() as ok');
    assert.equal(res.rows[0].ok, true);
  }

  // Ordinary authenticated user or spoofed user_metadata MUST return false and be blocked from writes
  for (const badClaims of [
    JSON.stringify({ role: 'authenticated', app_metadata: {}, user_metadata: { role: 'admin', is_admin: true } }),
    JSON.stringify({ role: 'authenticated', app_metadata: { role: 'customer' }, user_metadata: { role: 'admin' } }),
  ]) {
    await db.exec(`select set_config('request.jwt.claims', '${badClaims.replace(/'/g, "''")}', false);`);
    const res = await db.query<{ ok: boolean }>('select public.is_admin() as ok');
    assert.equal(res.rows[0].ok, false);
  }

  // Verify RLS prevents non-admin authenticated user from updating store_settings
  await db.exec(`grant usage on schema public to authenticated; grant select, insert, update on public.store_settings to authenticated;`);
  await assert.rejects(async () => {
    await db.exec(`
      begin;
      set local role authenticated;
      select set_config('request.jwt.claims', '{"role":"authenticated","app_metadata":{"role":"customer"},"user_metadata":{"role":"admin"}}', true);
      update public.store_settings set brand_name = 'HACKED' where id = 'singleton';
      commit;
    `);
    const check = await db.query<{ brand_name: string }>('select brand_name from public.store_settings');
    assert.notEqual(check.rows[0].brand_name, 'HACKED');
    if (check.rows[0].brand_name === 'DEX STORES') {
      throw new Error('RLS silently updated 0 rows cleanly');
    }
  });

  await db.close();
});
