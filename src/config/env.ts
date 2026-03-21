/**
 * Server-only configuration. Do not import from client components.
 */
export const serverEnv = {
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret:
    process.env.JWT_SECRET ?? "dev-only-secret-change-in-production-min-32-chars!!",
  nodeEnv: process.env.NODE_ENV ?? "development",
} as const;
