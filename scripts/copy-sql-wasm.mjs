import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "node_modules", "sql.js", "dist", "sql-wasm.wasm");
const destDir = path.join(root, "public");
const dest = path.join(destDir, "sql-wasm.wasm");

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log("Copied sql-wasm.wasm to public/");
