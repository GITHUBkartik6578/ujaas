import { z } from 'zod';

const optionalDays = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v.trim() === '' ? undefined : Number(v)))
  .refine((v) => v === undefined || (Number.isInteger(v) && v > 0), {
    message: 'must be a positive whole number of days',
  });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  IP_HASH_SALT: z.string().min(16, 'IP_HASH_SALT must be at least 16 characters'),
  PUBLIC_BASE_URL: z.string().url(),
  MEDIA_DIR: z.string().min(1).default('./uploads'),
  MEDIA_BASE_URL: z.string().default('/media'),
  // ASSUMPTION D-05: only site_admin is enabled until the owner approves more roles.
  ENABLED_ROLES: z
    .string()
    .default('site_admin')
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
  // ASSUMPTION D-12: core fields only; 10000 matches the mockup counter. Owner may change.
  SUBMISSION_BODY_MAX: z.coerce.number().int().min(500).default(10000),
  // D-02: unset means the purge job stays disabled. No number is chosen by the agent.
  RETENTION_DAYS_SUBMISSIONS: optionalDays,
  RETENTION_DAYS_CONTACT: optionalDays,
  RETENTION_DAYS_LOGS: optionalDays,
  // Multiplies the public rate limits. Leave at 1 in production; tests and load checks raise it.
  RATE_LIMIT_SCALE: z.coerce.number().min(1).max(1000).default(1),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  ERROR_MONITORING_DSN: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

const ROLES = ['site_admin', 'editor_in_chief', 'editor', 'content_manager'];

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }
  const env = result.data;
  const bad = env.ENABLED_ROLES.filter((r) => !ROLES.includes(r));
  if (bad.length > 0) throw new Error(`Invalid environment configuration:\n  - ENABLED_ROLES: unknown role(s) ${bad.join(', ')}`);
  if (env.NODE_ENV === 'production') {
    if (!env.PUBLIC_BASE_URL.startsWith('https://')) {
      throw new Error('Invalid environment configuration:\n  - PUBLIC_BASE_URL: must be https in production');
    }
  }
  return env;
}

let cached: Env | undefined;
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
