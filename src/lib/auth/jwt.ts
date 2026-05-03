import * as jose from 'jose';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET environment variable is required and must be at least 32 characters');
}
const JWT_SECRET = new TextEncoder().encode(jwtSecret);

export interface TokenPayload {
  userId: string;
  email: string;
}

export async function signToken(
  payload: TokenPayload,
  expiresIn: string = '15d'
): Promise<string> {
  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);

  return jwt;
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jose.jwtVerify(token, JWT_SECRET);

  // Validate payload structure
  if (typeof payload.userId !== 'string' || typeof payload.email !== 'string') {
    throw new Error('Invalid token payload structure');
  }

  return {
    userId: payload.userId,
    email: payload.email,
  };
}
