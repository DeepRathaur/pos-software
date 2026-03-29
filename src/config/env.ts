/**
 * Server-only configuration. Do not import from client components.
 * Use getters so values always match `process.env` (avoids stale snapshots after .env.local changes / dev HMR).
 */
export const serverEnv = {
  get databaseUrl() {
    return process.env.DATABASE_URL;
  },
  get jwtSecret() {
    return process.env.JWT_SECRET ?? "dev-only-secret-change-in-production-min-32-chars!!";
  },
  get nodeEnv() {
    return process.env.NODE_ENV ?? "development";
  },
};
