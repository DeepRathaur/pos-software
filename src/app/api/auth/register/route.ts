import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { signSessionToken } from "@/lib/auth";
import { handleRouteError, jsonOk, parseJson } from "@/lib/http";
import { registerSchema } from "@/lib/validation/schemas";

export async function POST(req: Request) {
  try {
    const body = registerSchema.parse(await parseJson(req));
    const existing = await pool.query(
      `SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [body.email.toLowerCase()]
    );
    if (existing.rowCount && existing.rowCount > 0) {
      return Response.json({ error: "Email already registered" }, { status: 409 });
    }
    const password_hash = await bcrypt.hash(body.password, 12);
    const ins = await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1,$2,$3) RETURNING id, email, name, created_at`,
      [body.email.toLowerCase(), password_hash, body.name]
    );
    const user = ins.rows[0];
    const token = await signSessionToken({
      sub: user.id as string,
      email: user.email as string,
    });
    return jsonOk({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    return handleRouteError(err);
  }
}
