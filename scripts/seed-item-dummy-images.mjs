/**
 * Set dummy image_url on items (Picsum seed = stable per item id).
 * By default only rows with NULL/empty image_url. Use --force to overwrite all.
 *
 * Usage: node scripts/seed-item-dummy-images.mjs
 *        node scripts/seed-item-dummy-images.mjs --force
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.local");

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

function dummyUrlForItemId(id) {
  const seed = String(id).replace(/-/g, "");
  return `https://picsum.photos/seed/${seed}/400/300`;
}

async function main() {
  const force = process.argv.includes("--force");
  loadEnvLocal();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL missing (.env.local)");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 2 });
  try {
    const sel = await pool.query(
      `SELECT id FROM items WHERE deleted_at IS NULL ${
        force ? "" : "AND (image_url IS NULL OR btrim(image_url) = '')"
      }`
    );
    let n = 0;
    for (const row of sel.rows) {
      const url = dummyUrlForItemId(row.id);
      await pool.query(`UPDATE items SET image_url = $1, updated_at = now() WHERE id = $2`, [
        url,
        row.id,
      ]);
      n += 1;
    }
    console.log(`Updated image_url on ${n} item(s)${force ? " (forced all)" : " (was empty only)"}.`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
