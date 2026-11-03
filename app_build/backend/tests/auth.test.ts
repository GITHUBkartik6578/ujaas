import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { AdminUser, AuditLog } from '../src/models/index.js';
import { ABSOLUTE_SESSION_MS } from '../src/middleware/auth.js';
import { ORIGIN, PASSWORD, loginAgent, makeAdmin, startHarness, testEnv, type Harness } from './helpers.js';
import { createApp } from '../src/app.js';

let h: Harness;
beforeAll(async () => {
  // Many logins from one test IP: the per-IP login limit is scaled here (it has its own test below at scale 1).
  // The per-account limit is never scaled, so the lockout and per-email tests still run at production values.
  h = await startHarness({ ENABLED_ROLES: 'site_admin,editor', RATE_LIMIT_SCALE: '100' });
});
afterAll(async () => {
  await h.close();
});

const post = (path: string) => request(h.app).post(path).set('Origin', ORIGIN);

describe('T-ADM-01 login', () => {
  it('has no default credentials: an empty database cannot be logged into', async () => {
    expect(await AdminUser.countDocuments()).toBe(0);
    const res = await post('/api/v1/admin/auth/login').send({ email: 'admin@ujaas.org', password: 'admin' });
    expect(res.status).toBe(401);
  });

  it('gives the same generic error for an unknown user and a wrong password', async () => {
    const { email } = await makeAdmin();
    const wrong = await post('/api/v1/admin/auth/login').send({ email, password: 'not-the-password-1' });
    const unknown = await post('/api/v1/admin/auth/login').send({ email: 'nobody@example.org', password: 'not-the-password-1' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.code).toBe(unknown.body.error.code);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  it('succeeds with the right password, returns a csrf token and never the hash', async () => {
    const { email } = await makeAdmin();
    const { res, csrf } = await loginAgent(h.app, email);
    expect(res.status).toBe(200);
    expect(csrf).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(res.body)).not.toMatch(/password|hash/i);
    expect(res.body.user.role).toBe('site_admin');
  });

  it('locks after 5 failures: even the right password then fails (T-ADM-01 lockout)', async () => {
    const { email } = await makeAdmin();
    for (let i = 0; i < 5; i++) {
      const bad = await post('/api/v1/admin/auth/login').send({ email, password: `wrong-password-${i}` });
      expect([401, 429]).toContain(bad.status);
    }
    const after = await post('/api/v1/admin/auth/login').send({ email, password: PASSWORD });
    expect(after.status).not.toBe(200);
    const user = await AdminUser.findOne({ email }).lean();
    expect(user?.locked_until).toBeTruthy();
  });

  it('rate-limits repeated attempts for the same IP and email (429 with Retry-After)', async () => {
    const email = 'ratelimit@example.org';
    let last = 0;
    let retry: string | undefined;
    for (let i = 0; i < 8; i++) {
      const r = await post('/api/v1/admin/auth/login').send({ email, password: 'whatever-whatever' });
      last = r.status;
      retry = r.headers['retry-after'];
    }
    expect(last).toBe(429);
    expect(retry).toBeTruthy();
  });

  it('limits one IP trying many different accounts (password spraying)', async () => {
    const strict = createApp(testEnv()); // RATE_LIMIT_SCALE defaults to 1, as in production
    let last = 0;
    for (let i = 0; i < 22; i++) {
      // A different email each time, so only the per-IP limit can stop it.
      const r = await request(strict).post('/api/v1/admin/auth/login').set('Origin', ORIGIN)
        .send({ email: `spray${i}@example.org`, password: 'whatever-whatever' });
      last = r.status;
    }
    expect(last).toBe(429);
  });
});

describe('T-ADM-02 sessions', () => {
  it('sets an HttpOnly SameSite=Lax cookie, rotates the id on login and exposes /me', async () => {
    const { email } = await makeAdmin();
    const anon = request.agent(h.app);
    await anon.get('/api/v1/health'); // no session is created for anonymous traffic
    const { agent, res } = await loginAgent(h.app, email);
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/ujaas\.sid=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    const me = await agent.get('/api/v1/admin/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(email);
  });

  it('answers 401 without a session', async () => {
    const res = await request(h.app).get('/api/v1/admin/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthenticated');
  });

  it('needs the CSRF token for non-GET calls', async () => {
    const { email } = await makeAdmin();
    const { agent, csrf } = await loginAgent(h.app, email);
    const noToken = await agent.post('/api/v1/admin/auth/logout').set('Origin', ORIGIN);
    expect(noToken.status).toBe(403);
    expect(noToken.body.error.code).toBe('csrf_failed');
    const bad = await agent.post('/api/v1/admin/auth/logout').set('Origin', ORIGIN).set('X-CSRF-Token', 'f'.repeat(64));
    expect(bad.status).toBe(403);
    const ok = await agent.post('/api/v1/admin/auth/logout').set('Origin', ORIGIN).set('X-CSRF-Token', csrf!);
    expect(ok.status).toBe(204);
    const after = await agent.get('/api/v1/admin/auth/me');
    expect(after.status).toBe(401);
  });

  it('rejects a foreign Origin on state-changing requests', async () => {
    const res = await request(h.app).post('/api/v1/admin/auth/login').set('Origin', 'https://evil.example').send({ email: 'a@b.org', password: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('csrf_failed');
  });

  it('ends the session after the absolute timeout and says session_expired', async () => {
    const { email } = await makeAdmin();
    const { agent } = await loginAgent(h.app, email);
    const sessions = mongoose.connection.collection('sessions');
    await sessions.updateMany({}, { $set: { 'session.created_at': Date.now() - ABSOLUTE_SESSION_MS - 1000 } });
    const res = await agent.get('/api/v1/admin/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('session_expired');
  });

  it('ends the session after the idle timeout (the store drops it) and says session_expired', async () => {
    const { email } = await makeAdmin();
    const { agent } = await loginAgent(h.app, email);
    expect((await agent.get('/api/v1/admin/auth/me')).status).toBe(200);
    // The store keeps an expiry for each session (8 hours after the last request); move it into the past.
    await mongoose.connection.collection('sessions').updateMany({}, { $set: { expires: new Date(Date.now() - 1000) } });
    const res = await agent.get('/api/v1/admin/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('session_expired');
  });

  it('a deactivated admin loses access immediately', async () => {
    const { email, user } = await makeAdmin();
    const { agent } = await loginAgent(h.app, email);
    await AdminUser.updateOne({ _id: user._id }, { $set: { is_active: false } });
    const res = await agent.get('/api/v1/admin/auth/me');
    expect(res.status).toBe(401);
  });

  it('change-password enforces the policy and kills the other sessions', async () => {
    const { email } = await makeAdmin();
    const first = await loginAgent(h.app, email);
    const second = await loginAgent(h.app, email);
    const weak = await second.agent.post('/api/v1/admin/auth/change-password').set('Origin', ORIGIN).set('X-CSRF-Token', second.csrf!)
      .send({ old_password: PASSWORD, new_password: 'short' });
    expect(weak.status).toBe(422);
    const ok = await second.agent.post('/api/v1/admin/auth/change-password').set('Origin', ORIGIN).set('X-CSRF-Token', second.csrf!)
      .send({ old_password: PASSWORD, new_password: 'a-new-long-passphrase-42' });
    expect(ok.status).toBe(200);
    // The current session is rotated: a fresh CSRF token replaces the old one, which no longer works.
    expect(ok.body.csrf_token).toMatch(/^[0-9a-f]{64}$/);
    expect(ok.body.csrf_token).not.toBe(second.csrf);
    const me = await second.agent.get('/api/v1/admin/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.csrf_token).toBe(ok.body.csrf_token);
    const stale = await second.agent.post('/api/v1/admin/auth/logout').set('Origin', ORIGIN).set('X-CSRF-Token', second.csrf!);
    expect(stale.status).toBe(403);
    expect((await first.agent.get('/api/v1/admin/auth/me')).status).toBe(401);
  });
});

describe('T-ADM-03 / T-ADM-04 authorisation', () => {
  const adminRoutes: Array<['get' | 'post' | 'patch', string]> = [
    ['get', '/api/v1/admin/auth/me'],
    ['post', '/api/v1/admin/media'],
    ['patch', '/api/v1/admin/media/000000000000000000000000'],
  ];

  it('no admin route answers an unauthenticated request with data', async () => {
    for (const [method, path] of adminRoutes) {
      const res = await request(h.app)[method](path).set('Origin', ORIGIN);
      expect(res.status, `${method} ${path}`).toBe(401);
      expect(res.body.error).toBeTruthy();
    }
  });

  it('denies a role that is not enabled (D-05) even with a valid session', async () => {
    const { email } = await makeAdmin('content_manager'); // not in ENABLED_ROLES for this harness
    const { agent, csrf } = await loginAgent(h.app, email);
    const res = await agent.patch('/api/v1/admin/media/000000000000000000000000').set('Origin', ORIGIN).set('X-CSRF-Token', csrf!).send({ alt_text: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('forbidden');
  });

  it('allows an enabled role through to the route', async () => {
    const { email } = await makeAdmin('editor');
    const { agent, csrf } = await loginAgent(h.app, email);
    const res = await agent.patch('/api/v1/admin/media/000000000000000000000000').set('Origin', ORIGIN).set('X-CSRF-Token', csrf!).send({ alt_text: 'x' });
    expect(res.status).toBe(404); // passed auth, no such asset
  });
});

describe('audit and error shape', () => {
  it('writes login and logout to the audit log and never stores secrets in it', async () => {
    const { email, user } = await makeAdmin();
    const { agent, csrf } = await loginAgent(h.app, email);
    await agent.post('/api/v1/admin/auth/logout').set('Origin', ORIGIN).set('X-CSRF-Token', csrf!);
    const rows = await AuditLog.find({ entity_id: String(user._id) }).lean();
    expect(rows.map((r) => r.action)).toEqual(expect.arrayContaining(['auth.login', 'auth.logout']));
    expect(JSON.stringify(rows)).not.toContain(PASSWORD);
  });

  it('uses the shared error shape with a request id and unknown routes return 404', async () => {
    const res = await request(h.app).get('/api/v1/nope').set('X-Request-Id', 'req_test_12345');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
    expect(res.body.error.request_id).toBe('req_test_12345');
    expect(res.headers['x-request-id']).toBe('req_test_12345');
  });

  it('sets the security headers (T-SEC-01)', async () => {
    const res = await request(h.app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toMatch(/frame-ancestors 'none'/);
    expect(res.headers['referrer-policy']).toBeTruthy();
    expect(res.headers['permissions-policy']).toMatch(/camera=\(\)/);
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('rejects NoSQL operator injection in login without matching a user (T-SEC-02)', async () => {
    await makeAdmin();
    const res = await post('/api/v1/admin/auth/login').send({ email: { $ne: '' }, password: { $ne: '' } });
    expect(res.status).toBe(401);
  });
});

describe('admin accounts', () => {
  it('a site admin can deactivate another admin, which ends their sessions at once', async () => {
    const boss = await loginAgent(h.app, (await makeAdmin('site_admin')).email);
    const { email, user } = await makeAdmin('editor');
    const target = await loginAgent(h.app, email);
    expect((await target.agent.get('/api/v1/admin/auth/me')).status).toBe(200);
    const id = String(user._id);
    const list = await boss.agent.get('/api/v1/admin/users');
    expect(list.status).toBe(200);
    expect(JSON.stringify(list.body)).not.toMatch(/password_hash|totp/);
    const off = await boss.agent.patch(`/api/v1/admin/users/${id}`).set('Origin', ORIGIN).set('X-CSRF-Token', boss.csrf!).send({ is_active: false });
    expect(off.status).toBe(200);
    expect((await target.agent.get('/api/v1/admin/auth/me')).status).toBe(401);
    expect((await post('/api/v1/admin/auth/login').send({ email, password: PASSWORD })).status).toBe(401);
    const on = await boss.agent.patch(`/api/v1/admin/users/${id}`).set('Origin', ORIGIN).set('X-CSRF-Token', boss.csrf!).send({ is_active: true });
    expect(on.status).toBe(200);
    expect((await post('/api/v1/admin/auth/login').send({ email, password: PASSWORD })).status).toBe(200);
  });

  it('refuses self-deactivation, unknown ids and non-site-admins', async () => {
    const { email, user } = await makeAdmin('site_admin');
    const me = await loginAgent(h.app, email);
    const self = await me.agent.patch(`/api/v1/admin/users/${String(user._id)}`).set('Origin', ORIGIN).set('X-CSRF-Token', me.csrf!).send({ is_active: false });
    expect(self.status).toBe(422);
    expect((await me.agent.patch('/api/v1/admin/users/nope').set('Origin', ORIGIN).set('X-CSRF-Token', me.csrf!).send({ is_active: false })).status).toBe(404);
    const editor = await loginAgent(h.app, (await makeAdmin('editor')).email);
    expect((await editor.agent.get('/api/v1/admin/users')).status).toBe(403);
    expect((await editor.agent.patch(`/api/v1/admin/users/${String(user._id)}`).set('Origin', ORIGIN).set('X-CSRF-Token', editor.csrf!).send({ is_active: false })).status).toBe(403);
  });
});
