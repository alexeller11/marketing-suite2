import { Router, Request, Response } from 'express';
import { getGoogleAuthUrl, exchangeCodeForToken, verifyGoogleToken } from './google-auth';
import { COOKIE_NAME } from '../shared/const';
import { getSessionCookieOptions } from './_core/cookies';
import { SignJWT, jwtVerify } from 'jose';
import axios from 'axios';
import { saveIntegrationCredentials, getIntegrationCredentials } from './db';

const router = Router();
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

async function getUserFromCookie(req: Request) {
  const cookies = req.headers.cookie
    ? Object.fromEntries(req.headers.cookie.split('; ').map(c => {
        const [k, ...v] = c.split('=');
        return [k, v.join('=')];
      }))
    : {};
  const sessionCookie = cookies[COOKIE_NAME];
  if (!sessionCookie) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret');
    const { payload } = await jwtVerify(sessionCookie, secret, { algorithms: ['HS256'] });
    return payload as { sub: string; userId: number; email: string; name: string };
  } catch {
    return null;
  }
}

router.get('/google/login', (req: Request, res: Response) => {
  const redirectUri = `${APP_URL}/api/auth/google/callback`;
  const authUrl = getGoogleAuthUrl(redirectUri);
  res.json({ authUrl });
});

router.get('/google/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).json({ error: 'Missing authorization code' });
  try {
    const redirectUri = `${APP_URL}/api/auth/google/callback`;
    const idToken = await exchangeCodeForToken(code as string, redirectUri);
    if (!idToken) return res.status(401).json({ error: 'Failed to exchange code for token' });
    const user = await verifyGoogleToken(idToken);
    if (!user) return res.status(401).json({ error: 'Failed to verify token' });
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
    const returnUrl = state ? Buffer.from(state as string, 'base64').toString() : '/';
    res.redirect(returnUrl);
  } catch (error) {
    console.error('[Auth] Google callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

router.get('/google-ads/login', async (req: Request, res: Response) => {
  const user = await getUserFromCookie(req);
  if (!user) return res.redirect(`${APP_URL}/login`);
  const { OAuth2Client } = await import('google-auth-library');
  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${APP_URL}/api/auth/google-ads/callback`
  );
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/adwords',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    state: Buffer.from(String(user.userId)).toString('base64'),
  });
  res.redirect(url);
});

router.get('/google-ads/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query;
  if (!code || !state) return res.redirect(`${APP_URL}/settings?error=missing_params`);
  try {
    const userId = parseInt(Buffer.from(state as string, 'base64').toString());
    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${APP_URL}/api/auth/google-ads/callback`
    );
    const { tokens } = await client.getToken(code as string);
    await saveIntegrationCredentials({
      userId,
      platform: 'google',
      accessToken: tokens.access_token || '',
      refreshToken: tokens.refresh_token || '',
      metadata: { scope: tokens.scope },
      isActive: true,
    });
    res.redirect(`${APP_URL}/settings?success=google_ads_connected`);
  } catch (error) {
    console.error('[Auth] Google Ads callback error:', error);
    res.redirect(`${APP_URL}/settings?error=google_ads_failed`);
  }
});

router.get('/meta/login', async (req: Request, res: Response) => {
  const user = await getUserFromCookie(req);
  if (!user) return res.redirect(`${APP_URL}/login`);
  const appId = process.env.META_APP_ID;
  const redirectUri = encodeURIComponent(`${APP_URL}/api/auth/meta/callback`);
  const scope = encodeURIComponent('ads_read,business_management');
  const stateParam = encodeURIComponent(Buffer.from(String(user.userId)).toString('base64'));
  const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&state=${stateParam}&response_type=code`;
  res.redirect(url);
});

router.get('/meta/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query;
  if (error) return res.redirect(`${APP_URL}/settings?error=meta_denied`);
  if (!code || !state) return res.redirect(`${APP_URL}/settings?error=missing_params`);
  try {
    const userId = parseInt(Buffer.from(state as string, 'base64').toString());
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const redirectUri = `${APP_URL}/api/auth/meta/callback`;
    const tokenRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: { client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code },
    });
    const shortToken = tokenRes.data.access_token;
    const longTokenRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: { grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: shortToken },
    });
    const longToken = longTokenRes.data.access_token;
    const accountsRes = await axios.get('https://graph.facebook.com/v18.0/me/adaccounts', {
      params: { access_token: longToken, fields: 'id,name,account_status,currency' },
    });
    const adAccounts = accountsRes.data.data || [];
    await saveIntegrationCredentials({
      userId,
      platform: 'meta',
      accessToken: longToken,
      metadata: { adAccounts },
      isActive: true,
    });
    res.redirect(`${APP_URL}/settings?success=meta_connected&accounts=${adAccounts.length}`);
  } catch (error) {
    console.error('[Auth] Meta callback error:', error);
    res.redirect(`${APP_URL}/settings?error=meta_failed`);
  }
});

router.get('/meta/accounts', async (req: Request, res: Response) => {
  const user = await getUserFromCookie(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const creds = await getIntegrationCredentials(user.userId, 'meta');
    if (!creds?.accessToken) return res.json({ accounts: [] });
    const accountsRes = await axios.get('https://graph.facebook.com/v18.0/me/adaccounts', {
      params: { access_token: creds.accessToken, fields: 'id,name,account_status,currency,amount_spent' },
    });
    res.json({ accounts: accountsRes.data.data || [] });
  } catch (error) {
    console.error('[Auth] Meta accounts error:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

router.get('/google-ads/accounts', async (req: Request, res: Response) => {
  const user = await getUserFromCookie(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const creds = await getIntegrationCredentials(user.userId, 'google');
    if (!creds?.accessToken) return res.json({ accounts: [] });
    const devToken = process.env.GOOGLE_API_KEY || '';
    const { OAuth2Client } = await import('google-auth-library');
    const oauthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    oauthClient.setCredentials({ access_token: creds.accessToken, refresh_token: creds.refreshToken || undefined });
    const { credentials } = await oauthClient.refreshAccessToken();
    const accessToken = credentials.access_token;
    const accountsRes = await axios.get(
      'https://googleads.googleapis.com/v17/customers:listAccessibleCustomers',
      { headers: { Authorization: `Bearer ${accessToken}`, 'developer-token': devToken } }
    );
    const customerIds = accountsRes.data.resourceNames?.map((r: string) => r.replace('customers/', '')) || [];
    const accounts = [];
    for (const id of customerIds.slice(0, 20)) {
      try {
        const custRes = await axios.get(
          `https://googleads.googleapis.com/v17/customers/${id}`,
          { headers: { Authorization: `Bearer ${accessToken}`, 'developer-token': devToken } }
        );
        accounts.push({ id, name: custRes.data.descriptiveName || id, currency: custRes.data.currencyCode });
      } catch {}
    }
    res.json({ accounts });
  } catch (error) {
    console.error('[Auth] Google Ads accounts error:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  const cookieOptions = getSessionCookieOptions(req);
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
  res.json({ success: true });
});

export default router;
