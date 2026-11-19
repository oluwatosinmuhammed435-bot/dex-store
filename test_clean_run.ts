import { PGlite } from '@electric-sql/pglite';
import * as fs from 'fs';
import * as path from 'path';

export async function initSupabaseEnv(db: PGlite) {
  await db.exec(`
    -- Create Supabase roles if not existing
    do $$
    begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon nologin;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'service_role') then
        create role service_role nologin;
      end if;
    end $$;

    create schema if not exists auth;
    create schema if not exists storage;

    create or replace function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
    $$;

    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(auth.jwt() ->> 'sub', '')::uuid;
    $$;

    create or replace function auth.role() returns text language sql stable as $$
      select coalesce(auth.jwt() ->> 'role', 'anon');
    $$;

    create table if not exists storage.buckets (
      id text primary key,
      name text not null,
      owner uuid,
      created_at timestamptz default now(),
      updated_at timestamptz default now(),
      public boolean default false,
      avif_autodetection boolean default false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );

    create table if not exists storage.objects (
      id uuid primary key default gen_random_uuid(),
      bucket_id text references storage.buckets(id),
      name text,
      owner uuid,
      created_at timestamptz default now(),
      updated_at timestamptz default now(),
      last_accessed_at timestamptz default now(),
      metadata jsonb,
      version text
    );
    alter table storage.objects enable row level security;
  `);
}

async function testCleanRun() {
  console.log('--- TEST 1: Fresh Database Run ---');
  const db = new PGlite();
  await initSupabaseEnv(db);

  const migrationSql = fs.readFileSync(
    path.join(process.cwd(), 'supabase', 'migrations', 'phase_3_security_migration.sql'),
    'utf-8'
  );

  await db.exec(migrationSql);
  console.log('SUCCESS: Migration executed cleanly and all 8 assertions passed in real PostgreSQL engine!');
  await db.close();
}

testCleanRun().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
