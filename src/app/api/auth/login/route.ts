import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { signSessionToken } from "@/lib/auth";
import { handleRouteError, jsonOk, parseJson } from "@/lib/http";
import { loginSchema } from "@/lib/validation/schemas";

export async function POST(req: Request) {
  try {
    const body = loginSchema.parse(await parseJson(req));
    const r = await pool.query(
      `SELECT id, email, name, password_hash FROM users
       WHERE email = $1 AND deleted_at IS NULL`,
      [body.email.toLowerCase()]
    );
    if (r.rows.length === 0) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const user = r.rows[0];
    const ok = await bcrypt.compare(body.password, user.password_hash as string);
    if (!ok) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const token = await signSessionToken({
      sub: user.id as string,
      email: user.email as string,
    });
    return jsonOk({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
