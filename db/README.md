# Database

## Test user (local dev)

After `schema.sql` is applied and `DATABASE_URL` is set in `.env.local`:

```bash
npm run seed:test-user
```

Default credentials (reset on each run of the script):

| Field | Value |
|--------|--------|
| Email | `test@pos.local` |
| Password | `TestPass123!` |

- **`schema.sql`** — full DDL for new environments.
- **`migrations/`** — incremental scripts for existing databases (run with `psql` or your migration tool).

## Performance notes

- **`idx_orders_business_completed_time`** — partial index for analytics that filter `status = 'completed'` and `created_at` ranges (dashboard, reports).
- **`pg_trgm` + GIN** on `items` — speeds up POS/catalog `ILIKE '%…%'` search on name, sku, description.
- After large data loads, run **`ANALYZE`** on hot tables (see migration file).

Some hosts require a one-time superuser (or `rds_superuser`) to run `CREATE EXTENSION pg_trgm`. If extension creation fails, ask the provider to enable `pg_trgm`, then re-run the migration.
