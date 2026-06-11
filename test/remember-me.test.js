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

assert.ok(rememberSeconds > sessionSeconds, 'Remember-me token should last longer');
assert.ok(sessionSeconds >= 23 * 60 * 60, 'Session token should be ~1 day');
assert.ok(rememberSeconds >= 29 * 24 * 60 * 60, 'Remember-me token should be ~30 days');

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
  storage.setItem('tc_token', signToken('1', rememberMe));
  storage.setItem('tc_user', JSON.stringify({ _id: '1', email: 'user@test.com' }));
  if (rememberMe) {
    localStorage.setItem('tc_remember_me', '1');
    localStorage.setItem('tc_saved_email', 'user@test.com');
  }

  return store;
}

const remembered = simulateSetSession(true);
assert.ok(remembered.local['tc_token'], 'Remember me uses localStorage');
assert.strictEqual(remembered.session['tc_token'], undefined);
assert.strictEqual(remembered.local['tc_remember_me'], '1');

const sessionOnly = simulateSetSession(false);
assert.ok(sessionOnly.session['tc_token'], 'Session login uses sessionStorage');
assert.strictEqual(sessionOnly.local['tc_token'], undefined);

function simulateClearSession(keepRememberPrefs) {
  const store = simulateSetSession(true);
  const savedEmail = store.local['tc_saved_email'];
  store.session = {};
  store.local['tc_token'] = undefined;
  store.local['tc_user'] = undefined;
  if (keepRememberPrefs) {
    store.local['tc_remember_me'] = '1';
    store.local['tc_saved_email'] = savedEmail;
  } else {
    delete store.local['tc_remember_me'];
    delete store.local['tc_saved_email'];
  }
  return store;
}

const afterLogout = simulateClearSession(true);
assert.strictEqual(afterLogout.local['tc_remember_me'], '1');
assert.strictEqual(afterLogout.local['tc_saved_email'], 'user@test.com');
assert.strictEqual(afterLogout.local['tc_token'], undefined);

console.log('All remember-me tests passed.');
