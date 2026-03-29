/**
 * Import Ivaan Foods menu from data/ivaan-menu-zomato.txt (Zomato PDF extract).
 * Requires DATABASE_URL in .env.local and a business whose name matches --business-name (default: Ivaan Foods).
 *
 * Usage: node scripts/import-ivaan-menu.mjs
 *        node scripts/import-ivaan-menu.mjs --dry-run
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.local");
const menuPath = path.join(root, "data", "ivaan-menu-zomato.txt");

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

const KNOWN_SECTIONS = new Set([
  "Coffee & Chai",
  "North Indian Specials",
  "Breakfast",
  "Sandwich",
  "South Indian",
  "Burger",
  "Thali",
  "Quick Lunch",
  "Main Course",
  "Chaat Specials",
  "Lassi Specials",
  "Rolls",
  "Chinese Starters",
  "Pasta",
  "Garam-Garam Pakode",
  "Momos",
  "Rice",
  "Biryani Wednesdays",
  "Shakes",
  "Pizza",
  "Fried Rice",
  "Office Combo",
  "Indian Breads",
  "Noodles",
  "Mocktails",
]);

function isSectionLine(line) {
  const t = line.trim();
  if (!t || t === "0") return false;
  if (t.includes("\t")) return false;
  if (t.startsWith("--")) return false;
  if (/^Category\s+Item/i.test(t)) return false;
  if (KNOWN_SECTIONS.has(t)) return true;
  // Short standalone titles (e.g. "Thali", "Sandwich")
  if (t.length < 50 && !/\d/.test(t)) {
    return /^[A-Za-z]/.test(t);
  }
  return false;
}

/** @returns {number[]} indices of positive price tokens */
function priceIndices(parts) {
  const idx = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (/^\d+\/\d+$/.test(p)) idx.push(i);
    else if (/^\d+(\.\d+)?$/.test(p) && parseFloat(p) > 0) idx.push(i);
  }
  return idx;
}

/**
 * @param {string[]} parts
 * @returns {{ name: string, price: number, description: string | null, category: string } | null}
 */
function parseItemParts(parts, defaultCategory) {
  if (parts.length < 2) return null;
  if (parts[0] === "0") return null;

  function findPriceIndex(arr) {
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      if (/^\d+\/\d+$/.test(p)) return i;
      if (/^\d+(\.\d+)?$/.test(p) && parseFloat(p) > 0) return i;
    }
    return -1;
  }

  let descriptionExtra = null;
  const pi = findPriceIndex(parts);
  if (pi === -1) {
    if (parts.length === 2) {
      const m = parts[1].match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
      if (m) {
        const price = parseFloat(m[1]);
        if (price > 0) {
          return {
            name: parts[0].trim(),
            price,
            description: m[2]?.trim() || null,
            category: defaultCategory,
          };
        }
      }
    }
    return null;
  }

  const tok = parts[pi];
  let price;
  if (/^\d+\/\d+$/.test(tok)) {
    price = parseFloat(tok.split("/")[0]);
    descriptionExtra = `Price tiers: ${tok}`;
  } else {
    price = parseFloat(tok);
  }

  if (!(price > 0)) return null;

  const before = parts.slice(0, pi);
  if (before.length === 0) return null;

  const name = before[0].trim();
  const mid = before.slice(1).join(" — ").trim();
  const description = [mid || null, descriptionExtra].filter(Boolean).join(" — ") || null;

  if (!name) return null;

  let desc = description;
  if (desc && KNOWN_SECTIONS.has(desc)) {
    desc = null;
  }

  return { name, price, description: desc, category: defaultCategory };
}

/** Two-column Zomato rows: "ItemA  priceA  ItemB  extra  priceB" */
function trySplitTwoColumnRow(parts, defaultCategory) {
  const idx = priceIndices(parts);
  if (idx.length < 2) return null;
  const i1 = idx[0];
  const i2 = idx[1];
  const block1 = parts.slice(0, i1 + 1);
  const block2 = parts.slice(i1 + 1, i2 + 1);
  const a = parseItemParts(block1, defaultCategory);
  const b = parseItemParts(block2, defaultCategory);
  if (a && b) return [a, b];
  return null;
}

/**
 * @returns {{ name: string, price: number, description: string | null, category: string } | null | Array}
 */
function parseItemRow(line, defaultCategory) {
  const trimmed = line.trim();
  if (!trimmed || trimmed === "0") return null;
  if (trimmed.startsWith("--")) return null;
  if (/^Category\s+Item/i.test(trimmed)) return null;

  if (!trimmed.includes("\t")) {
    return null;
  }

  let parts = trimmed.split("\t").map((s) => s.trim());
  if (parts[0] === "0" && parts.length >= 3) {
    parts = parts.slice(1);
  }

  if (parts.length < 2) return null;

  const two = trySplitTwoColumnRow(parts, defaultCategory);
  if (two) return two;

  const single = parseItemParts(parts, defaultCategory);
  return single;
}

function parseMenu(text) {
  const lines = text.split("\n");
  let category = "General";
  /** @type {Array<{category:string,name:string,price:number,description:string|null}>} */
  const out = [];

  for (const line of lines) {
    if (isSectionLine(line)) {
      category = line.trim();
      if (category === "Thali" && out.some((x) => x.name === "Thali")) {
        /* duplicate section header */
      }
      continue;
    }

    const item = parseItemRow(line, category);
    if (!item) continue;
    const list = Array.isArray(item) ? item : [item];
    for (const it of list) {
      out.push({
        category: it.category,
        name: it.name,
        price: it.price,
        description: it.description,
      });
    }
  }

  return out;
}

function dedupe(rows) {
  const seen = new Set();
  const res = [];
  for (const r of rows) {
    const key = `${r.category}::${r.name}::${r.price}`;
    if (seen.has(key)) continue;
    seen.add(key);
    res.push(r);
  }
  return res;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const nameArg = process.argv.find((a) => a.startsWith("--business-name="));
  const businessName = nameArg ? nameArg.split("=")[1] : "Ivaan Foods";

  loadEnvLocal();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL missing (.env.local)");
    process.exit(1);
  }

  if (!fs.existsSync(menuPath)) {
    console.error("Missing", menuPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(menuPath, "utf8");
  let rows = dedupe(parseMenu(raw));
  console.log(`Parsed ${rows.length} menu rows (after dedupe).`);

  if (dryRun) {
    console.log(rows.slice(0, 15));
    console.log("…");
    process.exit(0);
  }

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 2 });
  try {
    const b = await pool.query(
      `SELECT b.id, b.name FROM businesses b
       WHERE b.deleted_at IS NULL AND b.name ILIKE $1
       ORDER BY b.created_at ASC
       LIMIT 1`,
      [`%${businessName.replace(/%/g, "")}%`]
    );
    if (b.rowCount === 0) {
      console.error(
        `No business matching "${businessName}". Create it in Setup (Settings) first, then re-run.`
      );
      process.exit(1);
    }
    const businessId = b.rows[0].id;
    console.log(`Using business: ${b.rows[0].name} (${businessId})`);

    const catMap = new Map();
    let sort = 0;

    async function getOrCreateCategory(name) {
      if (catMap.has(name)) return catMap.get(name);
      const ex = await pool.query(
        `SELECT id FROM categories WHERE business_id = $1 AND name = $2 AND deleted_at IS NULL`,
        [businessId, name]
      );
      if (ex.rowCount > 0) {
        const id = ex.rows[0].id;
        catMap.set(name, id);
        return id;
      }
      const ins = await pool.query(
        `INSERT INTO categories (business_id, name, sort_order) VALUES ($1,$2,$3) RETURNING id`,
        [businessId, name, sort++]
      );
      const id = ins.rows[0].id;
      catMap.set(name, id);
      return id;
    }

    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const catId = await getOrCreateCategory(row.category);
      const ex = await pool.query(
        `SELECT id FROM items WHERE business_id = $1 AND category_id = $2 AND name = $3 AND deleted_at IS NULL`,
        [businessId, catId, row.name]
      );
      if (ex.rowCount > 0) {
        skipped += 1;
        continue;
      }
      await pool.query(
        `INSERT INTO items (
          business_id, category_id, kind, name, description, price, tax_rate, track_inventory, metadata, is_active
        ) VALUES ($1,$2,'menu_item',$3,$4,$5,0,false,'{}'::jsonb,true)`,
        [businessId, catId, row.name, row.description, row.price]
      );
      inserted += 1;
    }

    console.log(`Inserted ${inserted} items, skipped ${skipped} (already existed).`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
