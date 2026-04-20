import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "admin-session";
const SESSION_TTL = 60 * 60 * 8; // 8시간

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error("SESSION_SECRET or ADMIN_PASSWORD required");
  return new TextEncoder().encode(secret);
}

export async function createSession(): Promise<string> {
  return await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL}s`)
    .sign(getSecret());
}

export async function verifySession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export const SESSION_CONFIG = {
  name: SESSION_COOKIE,
  maxAge: SESSION_TTL,
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
};
