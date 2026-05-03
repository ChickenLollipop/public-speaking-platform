import { NextRequest } from 'next/server';
import { verifyToken, TokenPayload } from './jwt';

export interface AuthResult {
  success: boolean;
  user?: TokenPayload;
  error?: string;
}

export async function authenticate(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return { success: false, error: 'Missing authorization header' };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return { success: false, error: 'Invalid authorization header format' };
  }

  const token = parts[1];

  try {
    const user = await verifyToken(token);
    return { success: true, user };
  } catch (error) {
    return { success: false, error: 'Invalid or expired token' };
  }
}
