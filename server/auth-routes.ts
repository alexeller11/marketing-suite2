import { Router, Request, Response } from 'express';
import { getGoogleAuthUrl, exchangeCodeForToken, verifyGoogleToken } from './google-auth';
import { COOKIE_NAME } from '../shared/const';
import { getSessionCookieOptions } from './_core/cookies';
import { SignJWT, jwtVerify } from 'jose';
import axios from 'axios';
import { saveIntegrationCredentials, getIntegrationCredentials } from './db';

const router = Router();

function getBaseUrl(req: Request) {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}`;
}

async function getUserFromCookie(req: Request) {
  const cookies = req.headers.cookie ? Object.fromEntries(req.headers.cookie.split('; ').map(c => c.split('='))) : {};
  const sessionCookie = cookies[COOKIE_NAME];
  if (!sessionCookie) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret');
    const { payload } = await jwtVerify(sessionCookie, secret, { algorithms: ['HS256'] });
    return payload as { sub: string; userId: number; email: string; name: string };
  } catch { return null; }
}

// ─── Google Login ─────────────────────────────────────────────────────────────
router.get('/google/login', (req: Request, res: Response) => {
  const redirectUri = `${getBaseUrl(req)}/api/auth/google/callback`;
  res.json({ authUrl: getGoogleAuthUrl(redirectUri) });
});

router.get('/google/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).json({ error: 'Missing authorization code' });
  try {
    const redirectUri = `${getBaseUrl(req)}/api/auth/google/callback`;
    const idToken = await exchangeCodeForToken(code as string, redirectUri);
    if (!idToken) return res.status(401).json({ error: 'Failed to exchange code' });
    const user = await verifyGoogleToken(idToken);
    if (!user) return res.status(401).json({ error: 'Failed to verify token' });
    
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret');
    const token = await new SignJWT({ sub: user.openId, userId: user.id, email: user.email, name: user.name })
      .setProtectedHeader({ alg: 'HS256' }).setExpirationTime('7d').sign(secret);
    
    res.cookie(COOKIE_NAME, token, getSessionCookieOptions(req));
    res.redirect(state ? Buffer.from(state as string, 'base64').toString() : '/');
  } catch (error) { res.status(500).json({ error: 'Authentication failed' }); }
});

// ─── Google Ads OAuth ─────────────────────────────────────────────────────────
router.get('/google-ads/login', async (req: Request, res: Response) => {
  const baseUrl = getBaseUrl(req);
  const user = await getUserFromCookie(req);
  if (!user) return res.redirect(`${baseUrl}/login`);
  const { OAuth2Client } = await import('google-auth-library');
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, `${baseUrl}/api/auth/google-ads/callback`);
  
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Força o Google a enviar a chave mestra sempre
    scope: ['https://www.googleapis.com/auth/adwords', 'https://www.googleapis.com/auth/userinfo.email'],
    state: Buffer.from(String(user.userId)).toString('base64'),
  });
  res.redirect(url);
});

router.get('/google-ads/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query;
  const baseUrl = getBaseUrl(req);
  if (!code || !state) return res.redirect(`${baseUrl}/settings?error=missing_params`);
  
  try {
    const userId = parseInt(Buffer.from(state as string, 'base64').toString());
    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, `${baseUrl}/api/auth/google-ads/callback`);
    const { tokens } = await client.getToken(code as string);
    
    const existingCreds = await getIntegrationCredentials(userId, 'google');
    
    await saveIntegrationCredentials({
      userId,
      platform: 'google',
      accessToken: tokens.access_token || '',
      // Se o Google não enviar refreshToken agora, guardamos o que já tínhamos!
      refreshToken: tokens.refresh_token || existingCreds?.refreshToken || '',
      metadata: { scope: tokens.scope, tokenType: tokens.token_type },
      isActive: true,
    });
    res.redirect(`${baseUrl}/settings?success=google_ads_connected`);
  } catch (error) { res.redirect(`${baseUrl}/settings?error=google_ads_failed`); }
});

// ─── Puxar Contas do Google Ads ───────────────────────────────────────────────
router.get('/google-ads/accounts', async (req: Request, res: Response) => {
  const user = await getUserFromCookie(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const creds = await getIntegrationCredentials(user.userId, 'google');
    if (!creds?.accessToken) return res.json({ accounts: [] });
    
    const devToken = process.env.GOOGLE_API_KEY || '';
    
    // Conexão direta à API do Google Ads
    try {
      const accountsRes = await axios.get(
        'https://googleads.googleapis.com/v17/customers:listAccessibleCustomers',
        { headers: { Authorization: `Bearer ${creds.accessToken}`, 'developer-token': devToken } }
      );
      
      const customerIds = accountsRes.data.resourceNames?.map((r: string) => r.replace('customers/', '')) || [];
      const accounts = [];
      for (const id of customerIds.slice(0, 20)) {
        try {
          const custRes = await axios.get(
            `https://googleads.googleapis.com/v17/customers/${id}`,
            { headers: { Authorization: `Bearer ${creds.accessToken}`, 'developer-token': devToken } }
          );
          accounts.push({ id, name: custRes.data.descriptiveName || id, currency: custRes.data.currencyCode });
        } catch (e) {} // Ignora falhas em clientes individuais
      }
      return res.json({ accounts });
      
    } catch (googleApiError: any) {
      console.error('[Google Ads API Error]', googleApiError.response?.data || googleApiError.message);
      // Retornar código 200 com array vazio evita que o frontend faça crash (Erro 500), mostrando apenas aviso na tela.
      return res.json({ accounts: [], warning: googleApiError.response?.data?.error?.message || "Erro na Google API" });
    }
  } catch (error) {
    console.error('[Auth] Server error fetching Google accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// ─── Outras Rotas ─────────────────────────────────────────────────────────────
router.get('/meta/login', async (req: Request, res: Response) => { res.redirect('/settings'); });
router.get('/meta/callback', async (req: Request, res: Response) => { res.redirect('/settings'); });
router.get('/meta/accounts', async (req: Request, res: Response) => { res.json({ accounts: [] }); });

router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(req), maxAge: -1 });
  res.json({ success: true });
});

export default router;
