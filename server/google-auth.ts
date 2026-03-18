import { OAuth2Client } from 'google-auth-library';
import { eq } from 'drizzle-orm';
import { getDb } from './db';
import { users } from '../drizzle/schema';
import type { User } from '../drizzle/schema';

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID || '',
  process.env.GOOGLE_CLIENT_SECRET || '',
  process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
);

export async function verifyGoogleToken(token: string): Promise<User | null> {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) return null;
    const { sub: openId, email, name } = payload;
    const db = await getDb();
    if (!db) return null;
    const existingUser = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    if (existingUser.length > 0) {
      await db.update(users).set({ lastSignedIn: new Date(), email: email || existingUser[0].email, name: name || existingUser[0].name }).where(eq(users.openId, openId));
      return existingUser[0];
    } else {
      await db.insert(users).values({ openId, email: email || null, name: name || null, loginMethod: 'google', role: 'user', lastSignedIn: new Date() });
      const newUser = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
      return newUser.length > 0 ? newUser[0] : null;
    }
  } catch (error) {
    console.error('[Google Auth] Token verification failed:', error);
    return null;
  }
}

export function getGoogleAuthUrl(redirectUri: string): string {
  return googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    redirect_uri: redirectUri,
    state: Buffer.from('/').toString('base64'),
  });
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string | null> {
  try {
    const { tokens } = await googleClient.getToken({ code, redirect_uri: redirectUri });
    return tokens.id_token || null;
  } catch (error) {
    console.error('[Google Auth] Code exchange failed:', error);
    return null;
  }
}
