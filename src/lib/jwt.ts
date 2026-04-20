// src/lib/jwt.ts
import { SignJWT, jwtVerify } from 'jose'
import { env } from '../config'

const secret = new TextEncoder().encode(env.JWT_SECRET)
if (env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters for security')
}

export async function signJwt(
  payload: Record<string, unknown>,
  expiresIn: string,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret)
}

export async function verifyJwt(
  token: string,
): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as Record<string, unknown>
  } catch {
    return null
  }
}
