import test from 'node:test';
import assert from 'node:assert/strict';
import { checkIsAdmin } from './supabase';
import type { User } from '@supabase/supabase-js';

test('checkIsAdmin returns true when app_metadata.role is "admin"', () => {
  const user = {
    id: 'user-admin-1',
    email: 'admin@dexstores.com',
    app_metadata: { role: 'admin' },
    user_metadata: {},
  } as unknown as User;

  assert.equal(checkIsAdmin(user), true);
});

test('checkIsAdmin returns true when app_metadata.roles array contains "admin"', () => {
  const user = {
    id: 'user-admin-2',
    email: 'ops@dexstores.com',
    app_metadata: { roles: ['editor', 'admin'] },
    user_metadata: {},
  } as unknown as User;

  assert.equal(checkIsAdmin(user), true);
});

test('checkIsAdmin returns true when app_metadata.is_admin is true', () => {
  const user = {
    id: 'user-admin-3',
    email: 'super@dexstores.com',
    app_metadata: { is_admin: true },
    user_metadata: {},
  } as unknown as User;

  assert.equal(checkIsAdmin(user), true);
});

test('SECURITY: checkIsAdmin ignores user_metadata and denies access to tampering attempts', () => {
  // A malicious user could send a request updating user_metadata to { role: 'admin' }
  const maliciousUser = {
    id: 'attacker-1',
    email: 'attacker@example.com',
    app_metadata: { role: 'customer' }, // Server trusted role
    user_metadata: { role: 'admin', is_admin: true }, // Client untrusted metadata
  } as unknown as User;

  // MUST return false
  assert.equal(checkIsAdmin(maliciousUser), false);
});

test('checkIsAdmin returns false for ordinary users or empty metadata', () => {
  const customer = {
    id: 'customer-1',
    email: 'buyer@example.com',
    app_metadata: {},
    user_metadata: {},
  } as unknown as User;

  assert.equal(checkIsAdmin(customer), false);
  assert.equal(checkIsAdmin(null), false);
  assert.equal(checkIsAdmin(undefined), false);
});
