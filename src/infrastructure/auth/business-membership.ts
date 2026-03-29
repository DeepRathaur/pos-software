import { pool } from "@/infrastructure/database/pool";
import { HttpError } from "@/shared/kernel/http";

export async function assertBusinessMembership(userId: string, businessId: string) {
  const r = await pool.query(
    `SELECT 1 FROM business_users WHERE user_id = $1 AND business_id = $2`,
    [userId, businessId]
  );
  if (r.rowCount === 0) throw new HttpError("Forbidden", 403, "NOT_MEMBER");
}

export async function getBusinessForUser(userId: string, businessId: string) {
  const r = await pool.query(
    `SELECT b.*
     FROM businesses b
     INNER JOIN business_users bu ON bu.business_id = b.id
     WHERE bu.user_id = $1 AND b.id = $2 AND b.deleted_at IS NULL`,
    [userId, businessId]
  );
  if (r.rows.length === 0) throw new HttpError("Not found", 404, "BUSINESS_NOT_FOUND");
  return r.rows[0] as Record<string, unknown>;
}

export async function listBusinessesForUser(userId: string) {
  const r = await pool.query(
    `SELECT b.* FROM businesses b
     INNER JOIN business_users bu ON bu.business_id = b.id
     WHERE bu.user_id = $1 AND b.deleted_at IS NULL
     ORDER BY b.created_at DESC`,
    [userId]
  );
  return r.rows;
}
