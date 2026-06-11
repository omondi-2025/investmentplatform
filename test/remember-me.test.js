const assert = require('assert');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-remember-me';
const { signToken } = require('../middleware/auth');

function decodeExp(token) {
  const payload = jwt.decode(token);
  return payload.exp - payload.iat;
}

const sessionSeconds = decodeExp(signToken('user123', false));
const rememberSeconds = decodeExp(signToken('user123', true));

assert.ok(rememberSeconds > sessionSeconds, 'Remember-me token should last longer than session token');
assert.ok(sessionSeconds >= 23 * 60 * 60, 'Session token should be at least ~1 day');
assert.ok(rememberSeconds >= 29 * 24 * 60 * 60, 'Remember-me token should be at least ~30 days');

const sessionPayload = jwt.decode(signToken('user123', false));
const rememberPayload = jwt.decode(signToken('user123', true));
assert.strictEqual(sessionPayload.remember, false);
assert.strictEqual(rememberPayload.remember, true);

// Simulate api.js setSession storage behavior
function simulateSetSession(rememberMe) {
  const store = { local: {}, session: {} };
  const localStorage = {
    setItem(k, v) { store.local[k] = v; },
    getItem(k) { return store.local[k] || null; },
    removeItem(k) { delete store.local[k]; }
  };
  const sessionStorage = {
    setItem(k, v) { store.session[k] = v; },
    getItem(k) { return store.session[k] || null; },
    removeItem(k) { delete store.session[k]; }
  };

  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem('tc_token', 'test-token');
  storage.setItem('tc_user', JSON.stringify({ _id: '1', email: 'a@b.com' }));
  if (rememberMe) {
    localStorage.setItem('tc_remember_me', '1');
    localStorage.setItem('tc_saved_email', 'a@b.com');
  }

  return store;
}

const remembered = simulateSetSession(true);
assert.ok(remembered.local['tc_token'], 'Remember me should use localStorage for token');
assert.strictEqual(remembered.session['tc_token'], undefined);
assert.strictEqual(remembered.local['tc_remember_me'], '1');
assert.strictEqual(remembered.local['tc_saved_email'], 'a@b.com');

const sessionOnly = simulateSetSession(false);
assert.ok(sessionOnly.session['tc_token'], 'Session login should use sessionStorage for token');
assert.strictEqual(sessionOnly.local['tc_token'], undefined);
assert.strictEqual(sessionOnly.local['tc_remember_me'], undefined);

console.log('All remember-me tests passed.');
