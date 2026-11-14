'use client';

import { useEffect, useState } from 'react';
import { AdminApiError, type FieldError } from './session';

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', in_review: 'In review', approved: 'Approved', scheduled: 'Scheduled',
  published: 'Published', unpublished: 'Unpublished', archived: 'Archived',
};

/** Content types in English for the admin (the public site keeps its Hindi names in lib/format). */
export const TYPE_LABEL: Record<string, string> = {
  kavita: 'Poem (Kavita)', ghazal: 'Ghazal', geet: 'Song (Geet)', kahani: 'Story (Kahani)', laghukatha: 'Short story (Laghukatha)',
  nibandh: 'Essay (Nibandh)', sansmaran: 'Memoir (Sansmaran)', vichar: 'Opinion (Vichar)', vimarsh: 'Discourse (Vimarsh)',
  samiksha: 'Review (Samiksha)', other: 'Other',
};

/** One status mark per row: a pale tint with dark text, never colour alone (the word is the signal). */
export function StatusPill({ status }: { status: string }) {
  return <span className={`pill pill-${status}`}>{STATUS_LABEL[status] ?? status}</span>;
}

export function PageTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="page-title">
      <h1>{children}</h1>
      {action}
    </div>
  );
}

export function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <p className="hint">{hint}</p>}
      {error && <p className="field-error" role="alert" id={`${id}-err`}>{error}</p>}
    </div>
  );
}

// The admin is in English: field errors are worded here by code, never taken from the API's Hindi text.
const CODE_EN: Record<string, string> = {
  slug_taken: 'This slug is already in use', required: 'This check is not complete', too_small: 'This field is required',
  too_big: 'This is too long', too_short: 'This is too short', invalid_type: 'Invalid value', invalid_value: 'Invalid value',
  invalid_format: 'Wrong format', custom: 'Invalid value', invalid: 'Invalid value', duplicate: 'This already exists',
  unknown_category: 'Category not found', unknown_author: 'Author not found', unknown_admin: 'Editor not found',
  unknown_media: 'Image not found', not_published: 'Only published pieces can be chosen', in_use: 'This is in use and cannot be deleted',
  alt_required: 'Alt text is required', must_be_future: 'The time must be in the future', control_chars: 'The text contains invalid characters',
  delete_not_allowed: 'Only a draft that was never published can be deleted', self: 'You cannot deactivate your own account',
  last_site_admin: 'The last active site admin cannot be deactivated', use_convert: 'Use the Convert to draft action instead',
  note_required: 'A note is required for this action', incorrect: 'The old password is incorrect', number_taken: 'This issue number is already in use',
};
export const BLOCKER_LABEL: Record<string, string> = {
  lang_checked: 'language check', proof_checked: 'proofreading', final_approved: 'final approval',
  rights_note: 'permission note', credits: 'at least one author', cover_alt: 'cover image alt text',
  cover: 'cover image', items: 'at least one published piece', issue_number: 'issue number', publication_date: 'publication date',
};

/** Field-level messages from a 422, keyed by field name. */
export function fieldErrors(err: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (err instanceof AdminApiError) for (const f of err.fields as FieldError[]) out[f.field] = CODE_EN[f.code] ?? 'Invalid value';
  return out;
}

export function errorText(err: unknown): string {
  if (err instanceof AdminApiError) {
    if (err.code === 'publish_blocked') return `Complete before publishing: ${err.fields.map((f) => BLOCKER_LABEL[f.field] ?? f.field).join(', ')}`;
    if (err.code === 'conflict') return `${err.message || 'This item was changed by someone else'}. Reopen the page.`;
    if (err.status === 403) return 'You do not have permission to do this.';
    if (err.status === 429) return 'Too many requests. Please try again in a little while.';
    if (err.code === 'validation_failed') {
      const first = err.fields.map((f) => CODE_EN[f.code]).find(Boolean);
      return first ? `Please check the form: ${first}.` : 'Please check the form.';
    }
    return err.message ? `${err.message}.` : 'The action could not be completed. Please check the details.';
  }
  return 'Could not reach the server. Please try again.';
}

/** A quiet confirmation that disappears by itself; announced to screen readers. */
export function useToast() {
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 3500);
    return () => clearTimeout(t);
  }, [msg]);
  return { toast: msg ? <p className="toast" role="status">{msg}</p> : <p className="toast" role="status" />, show: setMsg };
}

export const ask = (message: string) => window.confirm(message);

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '–';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(iso));
}

/** Loads data once and again on demand; shows honest loading, empty and error states. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    load()
      .then((d) => { if (live) { setData(d); setError(null); } })
      .catch((e) => { if (live) setError(e); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, error, reload: () => setTick((t) => t + 1), loading: data === null && error === null };
}

export function LoadState({ error, loading, retry }: { error: unknown; loading: boolean; retry: () => void }) {
  if (error) {
    return (
      <div className="state" role="alert">
        <p>{errorText(error)}</p>
        <button type="button" className="btn" onClick={retry}>Try again</button>
      </div>
    );
  }
  if (loading) return <p className="state" aria-busy="true">Loading…</p>;
  return null;
}
