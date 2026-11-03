import path from 'node:path';
import express, { type Express } from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import { pino } from 'pino';
import { pinoHttp } from 'pino-http';
import type { Env } from './config/env.js';
import { errorHandler, notFoundHandler } from './lib/errors.js';
import { IDLE_SESSION_MS, SESSION_COOKIE } from './middleware/auth.js';
import { limits, originCheck, permissionsPolicy, requestId, securityHeaders } from './middleware/security.js';
import { createAuthRouter } from './routes/auth.js';
import { createAdminContentRouter } from './routes/admin-content.js';
import { createAdminStructureRouter } from './routes/admin-structure.js';
import { createMediaRouter } from './routes/media.js';
import { createAdminIssuesRouter, createPublicIssuesRouter } from './routes/issues.js';
import { createPublicRouter } from './routes/public.js';
import { createAdminSubmissionsRouter } from './routes/admin-submissions.js';
import { createSubmissionRouter } from './routes/submissions.js';

export function createApp(env: Env): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);

  const logger = pino({
    level: env.LOG_LEVEL,
    // No request or response bodies, no cookies, no auth headers in logs (privacy).
    redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
  });

  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as { id?: string }).id ?? 'unknown',
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: String(req.url).split('?')[0] }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use(securityHeaders(env));
  app.use(permissionsPolicy);

  // Uploaded images: separate static path, no directory listing, no sniffing, never executed.
  app.use(
    env.MEDIA_BASE_URL,
    express.static(path.resolve(env.MEDIA_DIR), {
      index: false,
      dotfiles: 'deny',
      fallthrough: false,
      maxAge: '7d',
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    }),
  );

  app.use(express.json({ limit: '100kb' }));

  app.use(
    session({
      name: SESSION_COOKIE,
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      rolling: true, // idle timeout slides with activity
      store: MongoStore.create({
        client: mongoose.connection.getClient() as never,
        dbName: mongoose.connection.name, // same database as the rest of the app
        stringify: false,
      }),
      cookie: {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: IDLE_SESSION_MS,
      },
    }),
  );

  app.use(originCheck(env));

  const api = express.Router();
  api.get('/health', (_req, res) => {
    const up = mongoose.connection.readyState === 1;
    res.status(up ? 200 : 503).json({ ok: up, db: up ? 'up' : 'down' });
  });
  api.use(createPublicRouter(env));
  api.use(createPublicIssuesRouter(env));
  api.use(createSubmissionRouter(env));
  api.use('/admin/auth', createAuthRouter(env));
  api.use('/admin/media', createMediaRouter(env));
  // These two apply their own auth to everything under /admin, so they come after auth and media.
  api.use('/admin', createAdminContentRouter(env));
  api.use('/admin', createAdminStructureRouter(env));
  api.use('/admin', createAdminSubmissionsRouter(env));
  api.use('/admin', createAdminIssuesRouter(env));
  app.use('/api/v1', limits.publicGeneral(env.RATE_LIMIT_SCALE), api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
