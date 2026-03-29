import { SignJWT, jwtVerify } from "jose";

import { serverEnv } from "@/config/env";
import { HttpError } from "@/shared/kernel/http";

function getSecret() {
  return new TextEncoder().encode(serverEnv.jwtSecret);
}

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
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const sub = payload.sub;
    const email = typeof payload.email === "string" ? payload.email : "";
    if (!sub) throw new HttpError("Unauthorized", 401, "INVALID_SESSION");
    return { sub, email };
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError("Unauthorized", 401, "INVALID_TOKEN");
  }
}

export async function getBearerToken(req: Request): Promise<string | null> {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7);
}

export async function requireUser(req: Request): Promise<SessionPayload> {
  const token = await getBearerToken(req);
  if (!token) throw new HttpError("Unauthorized", 401, "NO_TOKEN");
  return verifySessionToken(token);
}
