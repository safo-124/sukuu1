// lib/apiAuth.js
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { jwtVerify, SignJWT } from 'jose';

const alg = 'HS256';

function getSecretKey() {
  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT secret not configured (NEXTAUTH_SECRET)');
  return new TextEncoder().encode(secret);
}

// Create a compact JWS for mobile clients with the same claims we keep in NextAuth token
export async function issueMobileToken(payload, expiresIn = '30d') {
  const now = Math.floor(Date.now() / 1000);
  const exp = typeof expiresIn === 'string' ? undefined : now + expiresIn; // allow numeric seconds too
  let jwt = new SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt(now)
    .setExpirationTime(expiresIn || exp || '30d');
  return await jwt.sign(getSecretKey());
}

// Try NextAuth session; if not present, try Authorization: Bearer <token>
export async function getApiSession(request) {
  try {
    const session = await getServerSession(authOptions);
    if (session && session.user) return session;
  } catch {}

  const auth = request.headers.get('authorization') || request.headers.get('Authorization');
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.slice('Bearer '.length).trim();
    try {
      const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: [alg] });
      // Shape a NextAuth-like session
      return { user: payload };
    } catch (e) {
      return null;
    }
  }
  return null;
}

export function requireRole(session, roleOrRoles, schoolId) {
  if (!session?.user) return false;
  const roles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
  if (schoolId && session.user.schoolId !== schoolId) return false;
  return roles.includes(session.user.role);
}
