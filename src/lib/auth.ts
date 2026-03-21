import { SignJWT, jwtVerify } from "jose";

const getSecret = () => {
  const s = process.env.JWT_SECRET ?? "dev-only-secret-change-in-production-min-32-chars!!";
  return new TextEncoder().encode(s);
};

export type SessionPayload = {
  sub: string;
  email: string;
};

export async function signSessionToken(payload: SessionPayload, expiresIn = "7d") {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  const sub = payload.sub;
  const email = typeof payload.email === "string" ? payload.email : "";
  if (!sub) throw new Error("Unauthorized");
  return { sub, email };
}

export async function getBearerToken(req: Request): Promise<string | null> {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7);
}

export async function requireUser(req: Request): Promise<SessionPayload> {
  const token = await getBearerToken(req);
  if (!token) throw new Error("Unauthorized");
  return verifySessionToken(token);
}
