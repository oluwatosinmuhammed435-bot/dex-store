import { PGlite } from '@electric-sql/pglite';
import * as fs from 'fs';
import * as path from 'path';

const MIGRATION_SQL = fs.readFileSync(
  path.join(process.cwd(), 'supabase', 'migrations', 'phase_3_security_migration.sql'),
  'utf-8'
);

const DIAGNOSTIC_SQL = fs.readFileSync(
  path.join(process.cwd(), 'supabase', 'migrations', 'diagnostic_precheck.sql'),
  'utf-8'
);

export async function setupSupabaseEnv(db: PGlite) {
  await db.exec(`
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

interface TestResult {
  num: number;
  name: string;
  startingState: string;
  expectedResult: 'SUCCESS' | 'FAIL_SAFE_ROLLBACK';
  actualResult: 'PASS' | 'FAIL';
  details: string;
}

const results: TestResult[] = [];

async function runScenario(
  num: number,
  name: string,
  startingState: string,
  expectedResult: 'SUCCESS' | 'FAIL_SAFE_ROLLBACK',
  setupFn: (db: PGlite) => Promise<void>,
  verifyFn?: (db: PGlite) => Promise<void>
) {
  const db = new PGlite();
  await setupSupabaseEnv(db);

  try {
    await setupFn(db);
  } catch (err) {
    results.push({
      num,
      name,
      startingState,
      expectedResult,
      actualResult: 'FAIL',
      details: `Setup failed: ${(err as Error).message}`,
    });
    await db.close();
    return;
  }

  let migrationError: Error | null = null;
  try {
    await db.exec(MIGRATION_SQL);
  } catch (err) {
    migrationError = err as Error;
  }

  if (expectedResult === 'SUCCESS') {
    if (migrationError) {
      results.push({
        num,
        name,
        startingState,
        expectedResult,
        actualResult: 'FAIL',
        details: `Migration failed unexpectedly: ${migrationError.message}`,
      });
    } else {
      try {
        if (verifyFn) {
          await verifyFn(db);
        }
        results.push({
          num,
          name,
          startingState,
          expectedResult,
          actualResult: 'PASS',
          details: 'Migration completed and verified successfully.',
        });
      } catch (err) {
        results.push({
          num,
          name,
          startingState,
          expectedResult,
          actualResult: 'FAIL',
          details: `Verification assertion failed: ${(err as Error).message}`,
        });
      }
    }
  } else {
    // FAIL_SAFE_ROLLBACK expected
    if (!migrationError) {
      results.push({
        num,
        name,
        startingState,
        expectedResult,
        actualResult: 'FAIL',
        details: 'Expected migration to abort and rollback, but it succeeded without error!',
      });
    } else {
      results.push({
        num,
        name,
        startingState,
        expectedResult,
        actualResult: 'PASS',
        details: `Safely aborted with expected error: ${migrationError.message.split('\n')[0]}`,
      });
    }
  }

  await db.close();
}

export async function runAllTests() {
  console.log('================================================================');
  console.log('DEX STORES — Real PostgreSQL Engine Migration Test Suite (Expanded 35 Scenarios)');
  console.log('================================================================\n');

  // 01. Original products schema with stock_quantity
  await runScenario(
    1,
    'Original products schema with stock_quantity',
    'Table products has stock_quantity int4 (25 units), no stock column',
    'SUCCESS',
    async db => {
      await db.exec(`
        create table public.products (
          id uuid primary key default gen_random_uuid(),
          slug text unique not null,
          reference text unique not null,
          name text not null,
          stock_quantity integer not null default 0
        );
        insert into public.products (slug, reference, name, stock_quantity)
        values ('prod-1', 'REF-001', 'Product One', 25);
      `);
    },
    async db => {
      const res = await db.query<{ stock: number }>(
        'select stock from public.products where slug = $1',
        ['prod-1']
      );
      if (res.rows[0].stock !== 25) throw new Error(`Expected stock=25, got ${res.rows[0].stock}`);
    }
  );

  // 02. Schema with both stock and stock_quantity columns (harmonized)
  await runScenario(
    2,
    'Schema with both stock and stock_quantity columns (harmonized)',
    'Table products has stock=10 and stock_quantity=10',
    'SUCCESS',
    async db => {
      await db.exec(`
        create table public.products (
          id uuid primary key default gen_random_uuid(),
          slug text unique not null,
          reference text unique not null,
          name text not null,
          stock integer not null default 0,
          stock_quantity integer not null default 0
        );
        insert into public.products (slug, reference, name, stock, stock_quantity)
        values ('prod-2', 'REF-002', 'Product Two', 10, 10);
      `);
    },
    async db => {
      const res = await db.query<{ stock: number }>('select stock from public.products where slug = $1', ['prod-2']);
      if (res.rows[0].stock !== 10) throw new Error(`Expected stock=10, got ${res.rows[0].stock}`);
    }
  );

  // 03. Schema with only stock column
  await runScenario(
    3,
    'Schema with only stock column',
    'Table products has stock int4 (50 units)',
    'SUCCESS',
    async db => {
      await db.exec(`
        create table public.products (
          id uuid primary key default gen_random_uuid(),
          slug text unique not null,
          reference text unique not null,
          name text not null,
          stock integer not null default 50
        );
        insert into public.products (slug, reference, name, stock)
        values ('prod-3', 'REF-003', 'Product Three', 50);
      `);
    },
    async db => {
      const res = await db.query<{ stock: number }>('select stock from public.products where slug = $1', ['prod-3']);
      if (res.rows[0].stock !== 50) throw new Error(`Expected stock=50, got ${res.rows[0].stock}`);
    }
  );

  // 04. Schema with neither stock column
  await runScenario(
    4,
    'Schema with neither stock column',
    'Table products exists without any stock columns',
    'SUCCESS',
    async db => {
      await db.exec(`
        create table public.products (
          id uuid primary key default gen_random_uuid(),
          slug text unique not null,
          reference text unique not null,
          name text not null
        );
        insert into public.products (slug, reference, name)
        values ('prod-4', 'REF-004', 'Product Four');
      `);
    },
    async db => {
      const res = await db.query<{ stock: number }>('select stock from public.products where slug = $1', ['prod-4']);
      if (res.rows[0].stock !== 0) throw new Error(`Expected default stock=0, got ${res.rows[0].stock}`);
    }
  );

  // 05. Fractional stock values (safe abort)
  await runScenario(
    5,
    'Fractional stock values in numeric column (e.g. 10.5)',
    'Table products has stock numeric with value 10.5',
    'FAIL_SAFE_ROLLBACK',
    async db => {
      await db.exec(`
        create table public.products (
          id uuid primary key default gen_random_uuid(),
          slug text unique not null,
          reference text unique not null,
          name text not null,
          stock numeric
        );
        insert into public.products (slug, reference, name, stock)
        values ('prod-5', 'REF-005', 'Product Five', 10.5);
      `);
    }
  );

  // 06. Negative stock values (safe abort)
  await runScenario(
    6,
    'Negative stock values in products',
    'Table products has stock = -5',
    'FAIL_SAFE_ROLLBACK',
    async db => {
      await db.exec(`
        create table public.products (
          id uuid primary key default gen_random_uuid(),
          slug text unique not null,
          reference text unique not null,
          name text not null,
          stock integer
        );
        insert into public.products (slug, reference, name, stock)
        values ('prod-6', 'REF-006', 'Product Six', -5);
      `);
    }
  );

  // 07. Out-of-range integer stock values (safe abort)
  await runScenario(
    7,
    'Out-of-range integer stock values in bigint column',
    'Table products has stock bigint = 999999999999',
    'FAIL_SAFE_ROLLBACK',
    async db => {
      await db.exec(`
        create table public.products (
          id uuid primary key default gen_random_uuid(),
          slug text unique not null,
          reference text unique not null,
          name text not null,
          stock bigint
        );
        insert into public.products (slug, reference, name, stock)
        values ('prod-7', 'REF-007', 'Product Seven', 999999999999);
      `);
    }
  );

  // 08. TEXT and VARCHAR stock values convertible to integer
  await runScenario(
    8,
    'TEXT and VARCHAR stock values convertible to integer',
    'Table products has stock varchar = "42"',
    'SUCCESS',
    async db => {
      await db.exec(`
        create table public.products (
          id uuid primary key default gen_random_uuid(),
          slug text unique not null,
          reference text unique not null,
          name text not null,
          stock varchar(50)
        );
        insert into public.products (slug, reference, name, stock)
        values ('prod-8', 'REF-008', 'Product Eight', '42');
      `);
    },
    async db => {
      const res = await db.query<{ stock: number }>('select stock from public.products where slug = $1', ['prod-8']);
      if (res.rows[0].stock !== 42) throw new Error(`Expected stock=42, got ${res.rows[0].stock}`);
    }
  );

  // 09. Non-numeric TEXT stock values (safe abort)
  await runScenario(
    9,
    'Non-numeric TEXT stock values (e.g. "twenty")',
    'Table products has stock varchar = "twenty"',
    'FAIL_SAFE_ROLLBACK',
    async db => {
      await db.exec(`
        create table public.products (
          id uuid primary key default gen_random_uuid(),
          slug text unique not null,
          reference text unique not null,
          name text not null,
          stock varchar(50)
        );
        insert into public.products (slug, reference, name, stock)
        values ('prod-9', 'REF-009', 'Product Nine', 'twenty');
      `);
    }
  );

  // 10. TEXT[] gallery conversion to JSONB
  await runScenario(
    10,
    'TEXT[] gallery conversion to JSONB',
    'Table products has gallery text[] with 2 image URLs',
    'SUCCESS',
    async db => {
      await db.exec(`
        create table public.products (
          id uuid primary key default gen_random_uuid(),
          slug text unique not null,
          reference text unique not null,
          name text not null,
          gallery text[]
        );
        insert into public.products (slug, reference, name, gallery)
        values ('prod-10', 'REF-010', 'Product Ten', array['https://img.dex/1.webp', 'https://img.dex/2.webp']);
      `);
    },
    async db => {
      const res = await db.query<{ gallery: Array<{ url: string; caption: string }> }>(
        'select gallery from public.products where slug = $1',
        ['prod-10']
      );
      const g = res.rows[0].gallery;
      if (!Array.isArray(g) || g.length !== 2) throw new Error('Expected gallery to be array of length 2');
      if (g[0].url !== 'https://img.dex/1.webp') throw new Error(`Unexpected url: ${g[0].url}`);
      if (g[0].caption !== '') throw new Error(`Expected caption=""`);
    }
  );

  // 11. PostgreSQL native JSON type gallery conversion to JSONB
  await runScenario(
    11,
    'PostgreSQL native JSON type gallery conversion to JSONB',
    'Table products has gallery json with objects preserving captions and strings',
    'SUCCESS',
    async db => {
      await db.exec(`
        create table public.products (
          id uuid primary key default gen_random_uuid(),
          slug text unique not null,
          reference text unique not null,
          name text not null,
          gallery json
        );
        insert into public.products (slug, reference, name, gallery)
        values 
          ('prod-11a', 'REF-011A', 'Product 11A', '[{"url": "https://img.dex/a.webp", "caption": "Front angle"}]'::json),
          ('prod-11b', 'REF-011B', 'Product 11B', '["https://img.dex/b.webp", "https://img.dex/c.webp"]'::json),
          ('prod-11c', 'REF-011C', 'Product 11C', '{"url": "https://img.dex/single.webp", "caption": "Solo"}'::json);
      `);
    },
    async db => {
      const resA = await db.query<{ gallery: Array<{ url: string; caption: string }> }>(
        'select gallery from public.products where slug = $1',
        ['prod-11a']
      );
      if (resA.rows[0].gallery[0].caption !== 'Front angle') {
        throw new Error(`Expected caption 'Front angle', got ${resA.rows[0].gallery[0].caption}`);
      }

      const resB = await db.query<{ gallery: Array<{ url: string; caption: string }> }>(
        'select gallery from public.products where slug = $1',
        ['prod-11b']
      );
      if (resB.rows[0].gallery.length !== 2 || resB.rows[0].gallery[0].url !== 'https://img.dex/b.webp') {
        throw new Error('String array in json did not normalize to objects');
      }

      const resC = await db.query<{ gallery: Array<{ url: string; caption: string }> }>(
        'select gallery from public.products where slug = $1',
        ['prod-11c']
      );
      if (resC.rows[0].gallery.length !== 1 || resC.rows[0].gallery[0].caption !== 'Solo') {
        throw new Error('Single object in json did not normalize to array of 1 item with caption');
      }
    }
  );

  // 12. Existing JSONB gallery preservation
  await runScenario(
    12,
    'Existing JSONB gallery preservation',
    'Table products has gallery jsonb with existing [{"url": "a.webp", "caption": "cap"}]',
    'SUCCESS',
    async db => {
      await db.exec(`
        create table public.products (
          id uuid primary key default gen_random_uuid(),
          slug text unique not null,
          reference text unique not null,
          name text not null,
          gallery jsonb
        );
        insert into public.products (slug, reference, name, gallery)
        values ('prod-12', 'REF-012', 'Product Twelve', '[{"url": "a.webp", "caption": "cap"}]'::jsonb);
      `);
    },
    async db => {
      const res = await db.query<{ gallery: Array<{ url: string; caption: string }> }>(
        'select gallery from public.products where slug = $1',
        ['prod-12']
      );
      if (res.rows[0].gallery[0].caption !== 'cap') throw new Error('Existing caption was overwritten');
    }
  );

  // 13. Populated gallery_jsonb temporary column preservation (JSONB type)
  await runScenario(
    13,
    'Populated gallery_jsonb temporary column preservation (JSONB type)',
    'Table products has both gallery text[] and populated gallery_jsonb as jsonb',
    'SUCCESS',
    async db => {
      await db.exec(`
        create table public.products (
          id uuid primary key default gen_random_uuid(),
          slug text unique not null,
          reference text unique not null,
          name text not null,
          gallery text[],
          gallery_jsonb jsonb
        );
        insert into public.products (slug, reference, name, gallery, gallery_jsonb)
        values ('prod-13', 'REF-013', 'Product Thirteen', array['old.webp'], '[{"url": "saved.webp", "caption": "preserved"}]'::jsonb);
      `);
    },
    async db => {
      const res = await db.query<{ gallery: Array<{ url: string; caption: string }> }>(
        'select gallery from public.products where slug = $1',
        ['prod-13']
      );
      if (res.rows[0].gallery[0].url !== 'saved.webp') {
        throw new Error(`Expected saved.webp from gallery_jsonb, got ${res.rows[0].gallery[0].url}`);
      }
    }
  );

  // 14. Populated gallery_jsonb temporary column preservation (native JSON type)
  await runScenario(
    14,
    'Populated gallery_jsonb temporary column preservation (native JSON type)',
    'Table products has both gallery text[] and populated gallery_jsonb as native JSON type',
    'SUCCESS',
    async db => {
      await db.exec(`
        create table public.products (
          id uuid primary key default gen_random_uuid(),
          slug text unique not null,
          reference text unique not null,
          name text not null,
          gallery text[],
          gallery_jsonb json
        );
        insert into public.products (slug, reference, name, gallery, gallery_jsonb)
        values ('prod-14-json', 'REF-014-J', 'Product 14 Json', array['old.webp'], '[{"url": "saved-json.webp", "caption": "from_json"}]'::json);
      `);
    },
    async db => {
      const res = await db.query<{ gallery: Array<{ url: string; caption: string }> }>(
        'select gallery from public.products where slug = $1',
        ['prod-14-json']
      );
      if (res.rows[0].gallery[0].url !== 'saved-json.webp') {
        throw new Error(`Expected saved-json.webp, got ${res.rows[0].gallery[0].url}`);
      }
      if (res.rows[0].gallery[0].caption !== 'from_json') {
        throw new Error(`Expected caption from_json, got ${res.rows[0].gallery[0].caption}`);
      }
    }
  );

  // 15. Invalid or non-array gallery JSON (safe abort)
  await runScenario(
    15,
    'Invalid or non-array gallery JSON (e.g. object missing url)',
    'Table products has gallery jsonb with a JSON object missing url {"foo": "bar"}',
    'FAIL_SAFE_ROLLBACK',
    async db => {
      await db.exec(`
        create table public.products (
          id uuid primary key default gen_random_uuid(),
          slug text unique not null,
          reference text unique not null,
          name text not null,
          gallery jsonb
        );
        insert into public.products (slug, reference, name, gallery)
        values ('prod-15', 'REF-015', 'Product Fifteen', '{"foo": "bar"}'::jsonb);
      `);
    }
  );

  // 16. View dependency on products.gallery detection (safe abort)
  await runScenario(
    16,
    'View dependency on products.gallery detection',
    'Database has view dependent on products.gallery',
    'FAIL_SAFE_ROLLBACK',
    async db => {
      await db.exec(`
        create table public.products (
          id uuid primary key default gen_random_uuid(),
          slug text unique not null,
          reference text unique not null,
          name text not null,
          gallery text[]
        );
        create view public.v_product_gallery as select id, gallery from public.products;
      `);
    }
  );

  // 17. Trigger dependency on products.gallery detection (safe abort)
  await runScenario(
    17,
    'Trigger dependency on products.gallery detection',
    'Database has custom trigger referencing products.gallery',
    'FAIL_SAFE_ROLLBACK',
    async db => {
      await db.exec(`
        create table public.products (
          id uuid primary key default gen_random_uuid(),
          slug text unique not null,
          reference text unique not null,
          name text not null,
          gallery text[]
        );
        create or replace function public.check_gallery_trigger() returns trigger language plpgsql as $$
        begin
          if NEW.gallery is not null then
            -- custom gallery check
            null;
          end if;
          return NEW;
        end $$;
        create trigger trg_check_gallery before insert or update on public.products
        for each row execute function public.check_gallery_trigger();
      `);
    }
  );

  // 18. BOOLEAN store_settings id conversion to text "singleton"
  await runScenario(
    18,
    'BOOLEAN store_settings id conversion to text "singleton"',
    'Table store_settings has id boolean primary key default true',
    'SUCCESS',
    async db => {
      await db.exec(`
        create table public.store_settings (
          id boolean primary key default true,
          brand_name text not null default 'DEX STORES',
          whatsapp_number text not null default '123'
        );
        insert into public.store_settings (id, brand_name, whatsapp_number)
        values (true, 'DEX STORES', '123');
      `);
    },
    async db => {
      const res = await db.query<{ id: string }>('select id from public.store_settings');
      if (res.rows[0].id !== 'singleton') throw new Error(`Expected singleton, got ${res.rows[0].id}`);
    }
  );

  // 19. TEXT/VARCHAR store settings id standardization
  await runScenario(
    19,
    'TEXT/VARCHAR store settings id standardization',
    'Table store_settings has id text = "default_config"',
    'SUCCESS',
    async db => {
      await db.exec(`
        create table public.store_settings (
          id text primary key,
          brand_name text not null default 'DEX STORES'
        );
        insert into public.store_settings (id, brand_name) values ('default_config', 'DEX STORES');
      `);
    },
    async db => {
      const res = await db.query<{ id: string }>('select id from public.store_settings');
      if (res.rows[0].id !== 'singleton') throw new Error(`Expected id='singleton', got ${res.rows[0].id}`);
    }
  );

  // 20. Missing store settings ID column addition
  await runScenario(
    20,
    'Missing store settings ID column addition',
    'Table store_settings exists with brand_name but without an id column',
    'SUCCESS',
    async db => {
      await db.exec(`
        create table public.store_settings (
          brand_name text not null default 'DEX STORES',
          whatsapp_number text not null default '123'
        );
        insert into public.store_settings (brand_name, whatsapp_number) values ('DEX STORES', '123');
      `);
    },
    async db => {
      const res = await db.query<{ id: string }>('select id from public.store_settings');
      if (res.rows[0].id !== 'singleton') throw new Error(`Expected id='singleton', got ${res.rows[0].id}`);
    }
  );

  // 21. Multiple identical settings rows consolidation
  await runScenario(
    21,
    'Multiple identical settings rows consolidation',
    'Table store_settings has 3 duplicate rows with identical configurations',
    'SUCCESS',
    async db => {
      await db.exec(`
        create table public.store_settings (
          id text,
          brand_name text not null default 'DEX STORES',
          whatsapp_number text not null default '2340000000000',
          email text not null default 'contact@dex.ng'
        );
        insert into public.store_settings (id, brand_name, whatsapp_number, email)
        values 
          ('1', 'DEX STORES', '2340000000000', 'contact@dex.ng'),
          ('2', 'DEX STORES', '2340000000000', 'contact@dex.ng'),
          ('3', 'DEX STORES', '2340000000000', 'contact@dex.ng');
      `);
    },
    async db => {
      const res = await db.query<{ count: string; id: string }>('select count(*)::text as count, max(id) as id from public.store_settings');
      if (res.rows[0].count !== '1') throw new Error(`Expected exactly 1 row, got ${res.rows[0].count}`);
      if (res.rows[0].id !== 'singleton') throw new Error(`Expected id='singleton', got ${res.rows[0].id}`);
    }
  );

  // 22. Multiple conflicting settings rows (safe abort)
  await runScenario(
    22,
    'Multiple conflicting settings rows (must fail safely without silent deletion)',
    'Table store_settings has 2 rows with differing brand names and contact info',
    'FAIL_SAFE_ROLLBACK',
    async db => {
      await db.exec(`
        create table public.store_settings (
          id text,
          brand_name text,
          whatsapp_number text
        );
        insert into public.store_settings (id, brand_name, whatsapp_number)
        values 
          ('config-a', 'DEX STORES A', '11111111111'),
          ('config-b', 'DEX STORES B', '22222222222');
      `);
    }
  );

  // 23. Existing unknown permissive RLS policies cleanup
  await runScenario(
    23,
    'Existing unknown permissive RLS policies cleanup',
    'Table products has legacy open policy "Allow all public writes"',
    'SUCCESS',
    async db => {
      await db.exec(`
        create table public.products (
          id uuid primary key default gen_random_uuid(),
          slug text unique not null,
          reference text unique not null,
          name text not null
        );
        alter table public.products enable row level security;
        create policy "Allow all public writes" on public.products for all using (true) with check (true);
      `);
    },
    async db => {
      const res = await db.query<{ policyname: string }>('select policyname from pg_policies where schemaname = $1 and tablename = $2', ['public', 'products']);
      const names = res.rows.map(r => r.policyname);
      if (names.includes('Allow all public writes')) throw new Error('Permissive write policy was not cleaned up!');
      if (!names.includes('Public can view active products')) throw new Error('Missing hardened public read policy');
    }
  );

  // 24. Existing unrelated Storage bucket policies preservation
  await runScenario(
    24,
    'Existing unrelated Storage bucket policies preservation',
    'storage.objects has policy strictly scoped to bucket "user-avatars"',
    'SUCCESS',
    async db => {
      await db.exec(`
        insert into storage.buckets (id, name, public) values ('user-avatars', 'user-avatars', false) on conflict do nothing;
        create policy "Avatars private policy" on storage.objects for select to authenticated using (bucket_id = 'user-avatars');
      `);
    },
    async db => {
      const res = await db.query<{ policyname: string }>('select policyname from pg_policies where schemaname = $1 and tablename = $2 and policyname = $3', ['storage', 'objects', 'Avatars private policy']);
      if (res.rows.length !== 1) throw new Error('Unrelated storage policy was erroneously dropped!');
    }
  );

  // 25. Storage UPDATE policy with asymmetric qual vs with_check (dropped safely)
  await runScenario(
    25,
    'Storage UPDATE policy with asymmetric qual vs with_check dropped',
    'storage.objects has UPDATE policy where USING checks bucket_id but WITH CHECK does not',
    'SUCCESS',
    async db => {
      await db.exec(`
        insert into storage.buckets (id, name, public) values ('other-bucket', 'other-bucket', false) on conflict do nothing;
        create policy "Asymmetric update policy" on storage.objects for update to authenticated 
          using (bucket_id = 'other-bucket') with check (true);
      `);
    },
    async db => {
      const res = await db.query<{ policyname: string }>(
        'select policyname from pg_policies where schemaname = $1 and tablename = $2 and policyname = $3',
        ['storage', 'objects', 'Asymmetric update policy']
      );
      if (res.rows.length !== 0) throw new Error('Asymmetric unsafe storage policy was NOT dropped!');
    }
  );

  // 26. Existing private product-images bucket forced to public=true
  await runScenario(
    26,
    'Existing private product-images bucket forced to public=true',
    'storage.buckets has product-images with public=false',
    'SUCCESS',
    async db => {
      await db.exec(`
        insert into storage.buckets (id, name, public) values ('product-images', 'product-images', false);
      `);
    },
    async db => {
      const res = await db.query<{ public: boolean }>('select public from storage.buckets where id = $1', ['product-images']);
      if (res.rows[0].public !== true) throw new Error(`Expected public=true, got ${res.rows[0].public}`);
    }
  );

  // 27. Idempotency — Re-running migration twice on the same database
  await runScenario(
    27,
    'Idempotency — Re-running migration twice on the same database',
    'Execute migration on fresh DB, then re-execute on top of migrated state',
    'SUCCESS',
    async db => {
      await db.exec(MIGRATION_SQL);
    },
    async db => {
      const res = await db.query<{ count: string }>('select count(*)::text as count from public.store_settings');
      if (res.rows[0].count !== '1') throw new Error(`Expected 1 row, got ${res.rows[0].count}`);
    }
  );

  // 28. Diagnostic script execution safety across dirty legacy data
  await runScenario(
    28,
    'Diagnostic script execution safety across dirty legacy data',
    'Execute diagnostic_precheck.sql on database containing text stock, float NaN, and json gallery',
    'SUCCESS',
    async db => {
      await db.exec(`
        create table public.products (
          id uuid primary key default gen_random_uuid(),
          slug text unique not null,
          reference text unique not null,
          name text not null,
          stock varchar(50),
          stock_quantity varchar(50),
          gallery json
        );
        insert into public.products (slug, reference, name, stock, stock_quantity, gallery)
        values 
          ('prod-dirty-1', 'REF-D1', 'Dirty 1', 'invalid_non_numeric', '-5.2', '{"bad": "object"}'::json),
          ('prod-dirty-2', 'REF-D2', 'Dirty 2', '45', '45', '["https://valid.jpg"]'::json);
        
        create table public.store_settings (
          id text,
          brand_name text
        );
        insert into public.store_settings (id, brand_name) values ('a', 'DEX 1'), ('b', 'DEX 2');
      `);

      // Run diagnostic script — must execute without any runtime or cast exceptions
      await db.exec(DIAGNOSTIC_SQL);

      // Harmonize dirty records so the test harness can verify post-migration schema invariants
      await db.exec(`
        update public.products set stock = '10', stock_quantity = '10', gallery = '[]'::json where slug = 'prod-dirty-1';
        delete from public.store_settings where id = 'b';
      `);
    },
    async db => {
      const res = await db.query<{ count: string }>('select count(*)::text as count from public.products');
      if (res.rows[0].count !== '2') throw new Error(`Expected 2 products, got ${res.rows[0].count}`);
    }
  );

  // 29. Storage policy with weak bucket_id IS NOT NULL dropped safely
  await runScenario(
    29,
    'Storage policy with weak bucket_id IS NOT NULL dropped safely',
    'storage.objects has policy using (bucket_id is not null)',
    'SUCCESS',
    async db => {
      await db.exec(`
        create policy "Weak not null storage policy" on storage.objects for select to authenticated using (bucket_id is not null);
      `);
    },
    async db => {
      const res = await db.query<{ policyname: string }>(
        'select policyname from pg_policies where schemaname = $1 and tablename = $2 and policyname = $3',
        ['storage', 'objects', 'Weak not null storage policy']
      );
      if (res.rows.length !== 0) throw new Error('Policy with "bucket_id is not null" was NOT dropped!');
    }
  );

  // 30. Storage policy with weak bucket_id <> 'other' dropped safely
  await runScenario(
    30,
    'Storage policy with weak bucket_id <> "other" dropped safely',
    'storage.objects has policy using (bucket_id <> "other-bucket")',
    'SUCCESS',
    async db => {
      await db.exec(`
        create policy "Weak inequality storage policy" on storage.objects for select to authenticated using (bucket_id <> 'other-bucket');
      `);
    },
    async db => {
      const res = await db.query<{ policyname: string }>(
        'select policyname from pg_policies where schemaname = $1 and tablename = $2 and policyname = $3',
        ['storage', 'objects', 'Weak inequality storage policy']
      );
      if (res.rows.length !== 0) throw new Error('Policy with inequality was NOT dropped!');
    }
  );

  // 31. Storage policy with weak bucket_id = ANY(...) dropped safely
  await runScenario(
    31,
    'Storage policy with weak bucket_id = ANY(...) dropped safely',
    'storage.objects has policy using bucket_id = ANY(ARRAY["a", "b"])',
    'SUCCESS',
    async db => {
      await db.exec(`
        create policy "Weak ANY storage policy" on storage.objects for select to authenticated using (bucket_id = any(array['a', 'b']));
      `);
    },
    async db => {
      const res = await db.query<{ policyname: string }>(
        'select policyname from pg_policies where schemaname = $1 and tablename = $2 and policyname = $3',
        ['storage', 'objects', 'Weak ANY storage policy']
      );
      if (res.rows.length !== 0) throw new Error('Policy with ANY was NOT dropped!');
    }
  );

  // 32. Orphaned category_id in products causes safe abort with diagnostic
  await runScenario(
    32,
    'Orphaned category_id in products causes safe abort with diagnostic',
    'Product references non-existent category_id (migration must abort instead of silently nullifying)',
    'FAIL_SAFE_ROLLBACK',
    async db => {
      await db.exec(`
        create table public.categories (
          id uuid primary key default gen_random_uuid(),
          slug text unique not null,
          name text not null
        );
        create table public.products (
          id uuid primary key default gen_random_uuid(),
          slug text unique not null,
          reference text unique not null,
          name text not null,
          category_id uuid
        );
        -- Insert product referencing a non-existent category ID
        insert into public.products (slug, reference, name, category_id)
        values ('orphan-prod', 'REF-ORPHAN', 'Orphaned Product', 'a0000000-0000-0000-0000-000000000001'::uuid);
      `);
    }
  );

  // 33. Float stock column with NaN or Infinity causes safe abort
  await runScenario(
    33,
    'Float stock column with NaN or Infinity causes safe abort',
    'Product has stock float4 = "NaN"',
    'FAIL_SAFE_ROLLBACK',
    async db => {
      await db.exec(`
        create table public.products (
          id uuid primary key default gen_random_uuid(),
          slug text unique not null,
          reference text unique not null,
          name text not null,
          stock real
        );
        insert into public.products (slug, reference, name, stock)
        values ('nan-prod', 'REF-NAN', 'NaN Product', 'NaN'::real);
      `);
    }
  );

  // 34. Conflicting positive inventory (stock=10, stock_quantity=20) causes safe abort
  await runScenario(
    34,
    'Conflicting positive inventory (stock=10, stock_quantity=20) causes safe abort',
    'Product has stock=10 and stock_quantity=20 (differing positive counts)',
    'FAIL_SAFE_ROLLBACK',
    async db => {
      await db.exec(`
        create table public.products (
          id uuid primary key default gen_random_uuid(),
          slug text unique not null,
          reference text unique not null,
          name text not null,
          stock integer,
          stock_quantity integer
        );
        insert into public.products (slug, reference, name, stock, stock_quantity)
        values ('conflict-prod', 'REF-CONF', 'Conflicting Product', 10, 20);
      `);
    }
  );

  // 35. Inventory reconciliation: NULL, zero, and positive combinations
  await runScenario(
    35,
    'Inventory reconciliation: NULL, zero, and positive combinations',
    'Multiple products testing NULL+positive, 0+positive, positive+0, and NULL+NULL',
    'SUCCESS',
    async db => {
      await db.exec(`
        create table public.products (
          id uuid primary key default gen_random_uuid(),
          slug text unique not null,
          reference text unique not null,
          name text not null,
          stock integer,
          stock_quantity integer
        );
        insert into public.products (slug, reference, name, stock, stock_quantity)
        values 
          ('p-null-pos', 'REF-N1', 'Null Stock / Pos Qty', null, 15),
          ('p-zero-pos', 'REF-Z1', 'Zero Stock / Pos Qty', 0, 12),
          ('p-pos-zero', 'REF-P1', 'Pos Stock / Zero Qty', 8, 0),
          ('p-null-null', 'REF-NN', 'Null Stock / Null Qty', null, null),
          ('p-same-pos', 'REF-SP', 'Same Positive Counts', 22, 22);
      `);
    },
    async db => {
      const rows = (await db.query<{ slug: string; stock: number }>('select slug, stock from public.products order by slug')).rows;
      const map = Object.fromEntries(rows.map(r => [r.slug, r.stock]));
      if (map['p-null-pos'] !== 15) throw new Error(`Expected p-null-pos=15, got ${map['p-null-pos']}`);
      if (map['p-zero-pos'] !== 12) throw new Error(`Expected p-zero-pos=12, got ${map['p-zero-pos']}`);
      if (map['p-pos-zero'] !== 8) throw new Error(`Expected p-pos-zero=8, got ${map['p-pos-zero']}`);
      if (map['p-null-null'] !== 0) throw new Error(`Expected p-null-null=0, got ${map['p-null-null']}`);
      if (map['p-same-pos'] !== 22) throw new Error(`Expected p-same-pos=22, got ${map['p-same-pos']}`);
    }
  );

  console.log('\n================================================================');
  console.log('TEST RESULTS SUMMARY:');
  console.log('================================================================');
  let passCount = 0;
  for (const r of results) {
    const mark = r.actualResult === 'PASS' ? '✅ PASS' : '❌ FAIL';
    console.log(`[Test ${r.num.toString().padStart(2, '0')}] ${mark} : ${r.name}`);
    console.log(`          State: ${r.startingState}`);
    console.log(`        Outcome: ${r.details}\n`);
    if (r.actualResult === 'PASS') passCount++;
  }

  console.log(`TOTAL: ${passCount} / ${results.length} PASSED.`);
  if (passCount !== results.length) {
    process.exit(1);
  }
}

if (process.argv[1]?.includes('migration_test_suite.ts')) {
  runAllTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
}
