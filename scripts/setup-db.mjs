/**
 * Create database `pos_billing`, apply db/schema.sql, seed test user, update .env.local.
 * Password sources (first success wins): DATABASE_URL → POSTGRES_PASSWORD → db/.pgpassphrase
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import pg from "pg";
import bcrypt from "bcryptjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.local");
const schemaPath = path.join(root, "db", "schema.sql");

const PSQL =
  process.env.PSQL_PATH ||
  "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe";

function loadEnvLocal() {
  if (!fs.existsSync(envPath)) return;
  const txt = fs.readFileSync(envPath, "utf8");
  for (const line of txt.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    )
      val = val.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function readPgPassphrase() {
  const p = path.join(root, "db", ".pgpassphrase");
  if (!fs.existsSync(p)) return null;
  const line = fs.readFileSync(p, "utf8").trim().split("\n")[0];
  return line || null;
}

function buildUrl(user, password, host, port, database) {
  const u = encodeURIComponent(user);
  const pw = encodeURIComponent(password);
  return `postgresql://${u}:${pw}@${host}:${port}/${database}`;
}

function parseUrl(url) {
  const u = new URL(url);
  return {
    user: decodeURIComponent(u.username || "postgres"),
    password: decodeURIComponent(u.password || ""),
    host: u.hostname || "localhost",
    port: Number(u.port || 5432),
    database: (u.pathname || "/postgres").replace(/^\//, "") || "postgres",
  };
}

async function tryConnect(connectionString) {
  const pool = new pg.Pool({ connectionString, max: 1 });
  try {
    await pool.query("SELECT 1");
    return pool;
  } catch (e) {
    await pool.end().catch(() => {});
    throw e;
  }
}

async function getAdminPool() {
  const attempts = [];

  const rawUrl = process.env.DATABASE_URL;
  if (rawUrl) {
    const p = parseUrl(rawUrl);
    const adminUrl = buildUrl(p.user, p.password, p.host, p.port, "postgres");
    attempts.push({ label: "DATABASE_URL", adminUrl, parsed: p });
  }
  if (process.env.POSTGRES_PASSWORD) {
    const pw = process.env.POSTGRES_PASSWORD;
    attempts.push({
      label: "POSTGRES_PASSWORD",
      adminUrl: buildUrl("postgres", pw, "localhost", 5432, "postgres"),
      parsed: {
        user: "postgres",
        password: pw,
        host: "localhost",
        port: 5432,
        database: "postgres",
      },
    });
  }
  const fromFile = readPgPassphrase();
  if (fromFile) {
    attempts.push({
      label: "db/.pgpassphrase",
      adminUrl: buildUrl("postgres", fromFile, "localhost", 5432, "postgres"),
      parsed: {
        user: "postgres",
        password: fromFile,
        host: "localhost",
        port: 5432,
        database: "postgres",
      },
    });
  }

  if (attempts.length === 0) {
    console.error("No credentials: set DATABASE_URL in .env.local, or POSTGRES_PASSWORD, or db/.pgpassphrase");
    process.exit(1);
  }

  for (const { label, adminUrl, parsed } of attempts) {
    try {
      console.log(`Trying connection (${label})…`);
      const pool = await tryConnect(adminUrl);
      console.log(`Connected (${label}).`);
      return { pool, parsed };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`  ${label}: ${msg.split("\n")[0]}`);
    }
  }

  console.error(`
Could not connect to PostgreSQL.

Fix one of:
  1. Set DATABASE_URL in .env.local (correct postgres password).
  2. Or create db/.pgpassphrase — one line, postgres user password.
  3. Or:  $env:POSTGRES_PASSWORD="your_password"; npm run db:setup
`);
  process.exit(1);
}

function runPsql(parsed, database, args) {
  const env = {
    ...process.env,
    PGPASSWORD: parsed.password,
    PGUSER: parsed.user,
    PGHOST: parsed.host,
    PGPORT: String(parsed.port),
    PGDATABASE: database,
  };
  if (!fs.existsSync(PSQL)) {
    throw new Error(`psql not found at ${PSQL}. Set PSQL_PATH.`);
  }
  execFileSync(PSQL, args, { env, stdio: "inherit", cwd: root });
}

async function ensureDatabase(adminPool, dbName) {
  const r = await adminPool.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
  if (r.rowCount > 0) {
    console.log(`Database "${dbName}" already exists.`);
    return;
  }
  console.log(`Creating database "${dbName}"…`);
  await adminPool.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
}

function mergeEnvLocal(databaseUrl) {
  let content = "";
  if (fs.existsSync(envPath)) content = fs.readFileSync(envPath, "utf8");
  const lines = content.split("\n");
  const key = "DATABASE_URL";
  let found = false;
  const out = lines.map((line) => {
    if (line.trim().startsWith(`${key}=`)) {
      found = true;
      return `${key}=${databaseUrl}`;
    }
    return line;
  });
  if (!found) {
    if (out.length && out[out.length - 1] !== "") out.push("");
    out.push(`${key}=${databaseUrl}`);
  }
  fs.writeFileSync(envPath, out.join("\n"), "utf8");
  console.log(`Updated ${path.relative(root, envPath)} with working DATABASE_URL.`);
}

async function seedTestUser(databaseUrl) {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const EMAIL = "test@pos.local";
  const PASSWORD = "TestPass123!";
  const NAME = "Test User";
  const password_hash = await bcrypt.hash(PASSWORD, 12);
  try {
    await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         name = EXCLUDED.name,
         updated_at = now(),
         deleted_at = NULL`,
      [EMAIL.toLowerCase(), password_hash, NAME]
    );
    console.log(`Test user: ${EMAIL} / ${PASSWORD}`);
  } finally {
    await pool.end();
  }
}

async function main() {
  loadEnvLocal();

  const { pool: adminPool, parsed } = await getAdminPool();
  const dbName = "pos_billing";

  await ensureDatabase(adminPool, dbName);
  await adminPool.end();

  console.log(`Applying schema (${path.relative(root, schemaPath)})…`);
  runPsql(parsed, dbName, ["-v", "ON_ERROR_STOP=1", "-f", schemaPath]);

  const appUrl = buildUrl(parsed.user, parsed.password, parsed.host, parsed.port, dbName);
  mergeEnvLocal(appUrl);

  console.log("Seeding test user…");
  await seedTestUser(appUrl);

  console.log("\nDone. Restart `npm run dev` if it was already running.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
