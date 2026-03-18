import { Router, Request, Response } from 'express';
import { getGoogleAuthUrl, exchangeCodeForToken, verifyGoogleToken } from './google-auth';
import { COOKIE_NAME } from '../shared/const';
import { getSessionCookieOptions } from './_core/cookies';
import { SignJWT } from 'jose';

const router = Router();

// Get Google login URL
router.get('/google/login', (req: Request, res: Response) => {
  const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/google/callback`;
  const authUrl = getGoogleAuthUrl(redirectUri);
  res.json({ authUrl });
});

// Google OAuth callback
router.get('/google/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/google/callback`;
    const idToken = await exchangeCodeForToken(code as string, redirectUri);

    if (!idToken) {
      return res.status(401).json({ error: 'Failed to exchange code for token' });
    }

    const user = await verifyGoogleToken(idToken);

    if (!user) {
      return res.status(401).json({ error: 'Failed to verify token' });
    }

    // Create session cookie
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret');
    const token = await new SignJWT({
      sub: user.openId,
      userId: user.id,
      email: user.email,
      name: user.name,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(secret);

    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, token, cookieOptions);

    // Redirect to app or return success
    const returnUrl = state ? Buffer.from(state as string, 'base64').toString() : '/';
    res.redirect(returnUrl);
  } catch (error) {
    console.error('[Auth] Google callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  const cookieOptions = getSessionCookieOptions(req);
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
  res.json({ success: true });
});

export default router;
