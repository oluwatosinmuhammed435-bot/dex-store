import { PGlite } from '@electric-sql/pglite';

// Helper to initialize Supabase mock environment
async function initSupabaseEnv(db: PGlite) {
  await db.exec(`
    -- Create auth and storage schemas mimicking Supabase
    create schema if not exists auth;
    create schema if not exists storage;

    -- auth.jwt() mock using session setting
    create or replace function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
    $$;

    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(auth.jwt() ->> 'sub', '')::uuid;
    $$;

    create or replace function auth.role() returns text language sql stable as $$
      select coalesce(auth.jwt() ->> 'role', 'anon');
    $$;

    -- storage.buckets table
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

    -- storage.objects table
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

async function runTest() {
  console.log('Testing PGlite initialization with real PostgreSQL WASM...');
  const db = new PGlite();
  await initSupabaseEnv(db);
  const res = await db.query('SELECT version();');
  console.log('PostgreSQL version:', res.rows[0]);
  await db.close();
  console.log('PGlite test passed!');
}

runTest().catch(err => {
  console.error('PGlite test failed:', err);
  process.exit(1);
});
