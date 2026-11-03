import 'dotenv/config';
import { getEnv } from './config/env.js';
import { connectDb, disconnectDb } from './db/connect.js';
import { runMigrations } from './db/migrate.js';
import { createApp } from './app.js';
import { startScheduler } from './jobs/scheduler.js';

async function main() {
  // Fails loudly with a readable list when configuration is missing or invalid.
  const env = getEnv();
  await connectDb(env.MONGODB_URI);
  const applied = await runMigrations();
  const app = createApp(env);
  const scheduler = startScheduler(env); // publishes due scheduled items every minute
  const server = app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on :${env.PORT} (migrations applied: ${applied.length})`);
  });
  // A proxy in front of the API (the Next.js rewrite, a load balancer) reuses idle connections. Node closes idle
  // connections after 5 seconds by default, so a reused one can be reset mid-request (seen as a 500 from the proxy).
  // Keeping them open longer than any proxy's own idle limit removes the race.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
  const stop = () => {
    void scheduler.stop();
    server.close(() => void disconnectDb().then(() => process.exit(0)));
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
