import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { AuditLog, ContactMessage, Submission, SubmissionEvent } from '../src/models/index.js';
import { ORIGIN, loginAgent, makeAdmin, startHarness, type Harness } from './helpers.js';

let h: Harness;
let admin: ReturnType<typeof request.agent>;
let adminCsrf: string;
let editor: ReturnType<typeof request.agent>;
let editorCsrf: string;
let n = 0;

beforeAll(async () => {
  h = await startHarness();
  const a = await loginAgent(h.app, (await makeAdmin('site_admin')).email);
  admin = a.agent; adminCsrf = a.csrf!;
  const e = await loginAgent(h.app, (await makeAdmin('editor')).email);
  editor = e.agent; editorCsrf = e.csrf!;
});
afterAll(async () => { await h.close(); });

const del = (ag: typeof admin, csrf: string, url: string) => ag.delete(`/api/v1/admin${url}`).set('Origin', ORIGIN).set('X-CSRF-Token', csrf);
const submission = async () => {
  const s = await Submission.create({
    reference_id: `UJ-DEL-${++n}`, display_name: 'लेखक', email: `w${n}@example.org`, title: 'रचना', creation_type: 'kavita', body: 'पंक्ति',
    consent_original: true, consent_publication: true, consent_privacy: true, consent_text_version: 'v1', consent_at: new Date(),
    ip_hash: 'i', ua_hash: 'u', dedupe_hash: `d${n}`,
  });
  await SubmissionEvent.create({ submission_id: s._id, actor: 'writer', kind: 'submitted', to_status: 'pending_review' });
  return s;
};
const message = () => ContactMessage.create({ name: 'पाठक', email: `r${++n}@example.org`, subject: 'प्रश्न', message: 'नमस्ते', ip_hash: 'i' });

describe('delete submissions', () => {
  it('site_admin deletes a submission with its history, and it is audited', async () => {
    const s = await submission();
    const res = await del(admin, adminCsrf, `/submissions/${s._id}`);
    expect(res.status).toBe(204);
    expect(await Submission.exists({ _id: s._id })).toBeNull();
    expect(await SubmissionEvent.countDocuments({ submission_id: s._id })).toBe(0);
    expect(await AuditLog.exists({ action: 'submission.delete', entity_id: s._id } as never)).not.toBeNull();
  });
  it('an editor cannot delete a submission', async () => {
    const s = await submission();
    expect((await del(editor, editorCsrf, `/submissions/${s._id}`)).status).toBe(403);
    expect(await Submission.exists({ _id: s._id })).not.toBeNull();
  });
  it('an unknown submission is a 404', async () => {
    expect((await del(admin, adminCsrf, '/submissions/0123456789abcdef01234567')).status).toBe(404);
  });
});

describe('delete contact messages', () => {
  it('site_admin deletes a message, and it is audited', async () => {
    const m = await message();
    expect((await del(admin, adminCsrf, `/messages/${m._id}`)).status).toBe(204);
    expect(await ContactMessage.exists({ _id: m._id })).toBeNull();
    expect(await AuditLog.exists({ action: 'message.delete', entity_id: m._id } as never)).not.toBeNull();
  });
  it('an editor cannot delete a message', async () => {
    const m = await message();
    expect((await del(editor, editorCsrf, `/messages/${m._id}`)).status).toBe(403);
    expect(await ContactMessage.exists({ _id: m._id })).not.toBeNull();
  });
});
