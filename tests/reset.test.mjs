import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { runReset, ResetError } from '../api/_reset-core.js';

const sha = s => createHash('sha256').update(String(s)).digest('hex');

// Minimal in-memory Postgres covering exactly the statements _reset-core issues.
function fakeDb(seed = {}) {
  const tables = { reset_attempts: new Map(), reset_records: new Map(), auth_codes: new Map(), settings: new Map() };
  for (const [k, v] of Object.entries(seed.reset_records || {})) tables.reset_records.set(k, v);
  for (const [k, v] of Object.entries(seed.auth_codes || {})) tables.auth_codes.set(k, v);
  const query = async (text, params = []) => {
    if (text.startsWith('INSERT INTO reset_attempts')) {
      const c = (tables.reset_attempts.get(params[0]) || 0) + 1;
      tables.reset_attempts.set(params[0], c);
      return [{ count: c }];
    }
    if (text.startsWith('SELECT id,enabled,code_keys FROM reset_records')) {
      const r = tables.reset_records.get(params[0]);
      return r ? [r] : [];
    }
    if (text.startsWith('INSERT INTO auth_codes')) tables.auth_codes.set(params[0], { id: params[1], enabled: true });
    else if (text.startsWith('UPDATE auth_codes SET enabled=false')) {
      const row = tables.auth_codes.get(params[0]);
      if (row && row.id === params[1]) row.enabled = false;
    }
    else if (text.startsWith('INSERT INTO settings')) tables.settings.set(params[0], params[1]);
    else if (text.startsWith('DELETE FROM reset_records')) tables.reset_records.delete(params[0]);
    else throw new Error('unexpected query: ' + text);
    return [];
  };
  return { query, tables };
}

const REC = 'R'.repeat(43);
const CODE_OK = 'New-Code_12345';
const NOW = new Date('2026-10-21T14:00:00Z');
const provisioned = () => fakeDb({
  reset_records: { [sha(REC)]: { id: 'yehuda', enabled: true, code_keys: [sha('old-code-1'), sha('old-code-2')] } },
  auth_codes: { [sha('old-code-1')]: { id: 'yehuda', enabled: true }, [sha('other')] : { id: 'someone', enabled: true } },
});

test('malformed recovery rejected before any lookup, uniform 401', async () => {
  const db = provisioned();
  await assert.rejects(runReset({ query: db.query, body: { recovery: 'short', code: CODE_OK }, now: NOW }),
    e => e instanceof ResetError && e.status === 401 && e.error === 'unauthorized');
  assert.equal(db.tables.reset_attempts.size, 0, 'no attempt counted for malformed input');
});

test('well-shaped unknown recovery -> uniform 401, attempt counted, recovery not burned', async () => {
  const db = provisioned();
  await assert.rejects(runReset({ query: db.query, body: { recovery: 'X'.repeat(43), code: CODE_OK }, now: NOW }),
    e => e.status === 401 && e.error === 'unauthorized');
  assert.equal(db.tables.reset_attempts.size, 2);
  assert.ok(db.tables.reset_records.has(sha(REC)), 'real recovery untouched');
});

test('invalid new code -> 400 invalid_new_code, no state change', async () => {
  const db = provisioned();
  await assert.rejects(runReset({ query: db.query, body: { recovery: REC, code: '2short' }, now: NOW }),
    e => e.status === 400 && e.error === 'invalid_new_code');
  assert.ok(db.tables.reset_records.has(sha(REC)));
});

test('successful reset: new code enabled, listed old codes disabled, env flag set, recovery burned', async () => {
  const db = provisioned();
  const r = await runReset({ query: db.query, body: { recovery: REC, code: CODE_OK }, now: NOW });
  assert.deepEqual(r, { id: 'yehuda' });
  assert.deepEqual(db.tables.auth_codes.get(sha(CODE_OK)), { id: 'yehuda', enabled: true });
  assert.equal(db.tables.auth_codes.get(sha('old-code-1')).enabled, false);
  assert.equal(db.tables.auth_codes.get(sha('other')).enabled, true, 'code of another id untouched');
  assert.equal(db.tables.settings.get('auth_env_disabled'), '1');
  assert.ok(!db.tables.reset_records.has(sha(REC)), 'recovery burned');
});

test('burned recovery cannot be reused', async () => {
  const db = provisioned();
  await runReset({ query: db.query, body: { recovery: REC, code: CODE_OK }, now: NOW });
  await assert.rejects(runReset({ query: db.query, body: { recovery: REC, code: 'Another_Code_9' }, now: NOW }),
    e => e.status === 401 && e.error === 'unauthorized');
});

test('disabled recovery record -> uniform 401', async () => {
  const db = provisioned();
  db.tables.reset_records.get(sha(REC)).enabled = false;
  await assert.rejects(runReset({ query: db.query, body: { recovery: REC, code: CODE_OK }, now: NOW }),
    e => e.status === 401);
});

test('hourly cap: 6th attempt in the same hour -> 429, recovery stays valid', async () => {
  const db = provisioned();
  const bad = { recovery: 'X'.repeat(43), code: CODE_OK };
  for (let i = 0; i < 5; i++) await assert.rejects(runReset({ query: db.query, body: bad, now: NOW }), e => e.status === 401);
  await assert.rejects(runReset({ query: db.query, body: bad, now: NOW }), e => e.status === 429 && e.error === 'request_rate_limited');
  // the cap counts every attempt, so even the real recovery gets 429 inside this hour...
  await assert.rejects(runReset({ query: db.query, body: { recovery: REC, code: CODE_OK }, now: NOW }), e => e.status === 429);
  // ...but it was not burned: one hour later it works
  const r = await runReset({ query: db.query, body: { recovery: REC, code: CODE_OK }, now: new Date(NOW.getTime() + 3600000) });
  assert.deepEqual(r, { id: 'yehuda' });
});

test('new code same value as an old disabled hash re-enables it under the right id', async () => {
  const db = fakeDb({ reset_records: { [sha(REC)]: { id: 'yehuda', enabled: true, code_keys: [] } },
    auth_codes: { [sha(CODE_OK)]: { id: 'stale', enabled: false } } });
  await runReset({ query: db.query, body: { recovery: REC, code: CODE_OK }, now: NOW });
  assert.deepEqual(db.tables.auth_codes.get(sha(CODE_OK)), { id: 'yehuda', enabled: true });
});

test('record with invalid shape -> uniform 401', async () => {
  const db = fakeDb({ reset_records: { [sha(REC)]: { id: 'yehuda!!', enabled: true, code_keys: [] } } });
  await assert.rejects(runReset({ query: db.query, body: { recovery: REC, code: CODE_OK }, now: NOW }), e => e.status === 401);
});
