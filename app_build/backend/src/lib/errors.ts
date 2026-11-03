import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

export interface FieldError {
  field: string;
  code: string;
  message_hi?: string;
}

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public message_hi?: string,
    public fields?: FieldError[],
    public headers?: Record<string, string>,
  ) {
    super(message);
  }
}

export const notFound = () => new AppError(404, 'not_found', 'Not found', 'पृष्ठ नहीं मिला');
export const unauthenticated = () => new AppError(401, 'unauthenticated', 'Authentication required', 'कृपया लॉग इन करें');
export const sessionExpired = () =>
  new AppError(401, 'session_expired', 'Session expired', 'सत्र समाप्त हो गया, कृपया फिर से लॉग इन करें');
export const forbidden = () => new AppError(403, 'forbidden', 'Not allowed', 'इस कार्य की अनुमति नहीं है');
export const validationFailed = (fields: FieldError[]) =>
  new AppError(422, 'validation_failed', 'Validation failed', 'कृपया जानकारी जाँचें', fields);

// Hindi messages for the common validation failures, so forms can show a message next to the field.
const ZOD_HI: Record<string, string> = {
  invalid_type: 'यह क्षेत्र आवश्यक है',
  too_small: 'यह क्षेत्र आवश्यक है',
  too_big: 'यह बहुत लंबा है',
  invalid_format: 'सही प्रारूप में लिखें',
  invalid_value: 'मान सही नहीं है',
  custom: 'मान सही नहीं है',
};

export function zodToFields(err: ZodError): FieldError[] {
  return err.issues.map((i) => ({ field: i.path.join('.'), code: i.code, message_hi: ZOD_HI[i.code] }));
}

/** Anything that is not one of our own errors becomes a 503 so a failed write never looks like a bug in the request. */
export const unavailable = () => new AppError(503, 'service_unavailable', 'Service unavailable', 'सेवा अभी उपलब्ध नहीं है, कृपया बाद में प्रयास करें');

export const notFoundHandler: RequestHandler = (_req, _res, next) => next(notFound());

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const request_id = (req as { id?: string }).id ?? 'unknown';
  let status = 500;
  let body: Record<string, unknown> = {
    code: 'internal_error',
    message: 'Internal server error',
    message_hi: 'कुछ गड़बड़ हुई, कृपया पुनः प्रयास करें',
  };
  if (err instanceof AppError) {
    status = err.status;
    body = { code: err.code, message: err.message, message_hi: err.message_hi, fields: err.fields };
    if (err.headers) for (const [k, v] of Object.entries(err.headers)) res.setHeader(k, v);
  } else if (err instanceof ZodError) {
    status = 422;
    body = { code: 'validation_failed', message: 'Validation failed', fields: zodToFields(err) };
  } else if (typeof err?.status === 'number' && err.status >= 400 && err.status < 500 && err.type !== 'entity.too.large' && err.type !== 'entity.parse.failed') {
    status = err.status;
    body = status === 404
      ? { code: 'not_found', message: 'Not found', message_hi: 'पृष्ठ नहीं मिला' }
      : { code: 'bad_request', message: 'Bad request' };
  } else if (err?.type === 'entity.too.large') {
    status = 413;
    body = { code: 'payload_too_large', message: 'Payload too large' };
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    body = { code: 'bad_request', message: 'Malformed JSON' };
  }
  if (status >= 500) {
    // Log id and message only: never request bodies (may hold private submission text).
    req.log?.error({ request_id, err_name: err?.name, err_message: err?.message }, 'unhandled error');
  }
  res.status(status).json({ error: { ...body, request_id } });
};
