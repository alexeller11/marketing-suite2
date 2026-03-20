import { getIntegrationCredentials, upsertCampaign, saveCampaignSnapshot, getCampaignsByUserId } from "../db";
import axios from "axios";
import { OAuth2Client } from "google-auth-library";

export async function syncGoogleAdsCampaigns(userId: number, customerId: string): Promise<{ synced: number; errors: string[] }> {
  const creds = await getIntegrationCredentials(userId, "google");
  if (!creds?.accessToken) throw new Error("Google Ads não conectado.");

  let accessToken = creds.accessToken;
  try {
    const oauthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    oauthClient.setCredentials({ access_token: creds.accessToken, refresh_token: creds.refreshToken || undefined });
    const { credentials } = await oauthClient.refreshAccessToken();
    accessToken = credentials.access_token || accessToken;
  } catch (e) {
    throw new Error("Sessão do Google expirou. Vá a Configurações e clique em Reconectar.");
  }

  const devToken = process.env.GOOGLE_API_KEY || '';
  const headers = { Authorization: `Bearer ${accessToken}`, 'developer-token': devToken, 'login-customer-id': customerId };
  const errors: string[] = [];
  let synced = 0;

  try {
    const query = `SELECT campaign.id, campaign.name, campaign.status, metrics.impressions, metrics.clicks, metrics.conversions, metrics.cost_micros, metrics.ctr, metrics.average_cpc FROM campaign WHERE segments.date DURING LAST_30_DAYS AND campaign.status != 'REMOVED'`;
    const res = await axios.post(`https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:search`, { query }, { headers });
    
    for (const row of res.data.results || []) {
      try {
        const c = row.campaign;
        const m = row.metrics;
        const spent = (m.costMicros || 0) / 1_000_000;
        const saved = await upsertCampaign(userId, {
          externalId: c.id, platform: "google", name: c.name,
          status: c.status?.toLowerCase() === "enabled" ? "active" : "paused",
          spent, impressions: m.impressions || 0, clicks: m.clicks || 0,
          conversions: Math.round(m.conversions || 0),
          ctr: (m.ctr || 0) * 100, cpc: (m.averageCpc || 0) / 1_000_000,
        });
        if (saved) synced++;
      } catch (e) { errors.push(`Google campaign error: ${e}`); }
    }
  } catch (e: any) { throw new Error(`Google Ads API Falhou: ${e.response?.data?.error?.message || e.message}`); }
  return { synced, errors };
}

export async function snapshotAllCampaigns(userId: number): Promise<void> {
  const userCampaigns = await getCampaignsByUserId(userId);
  for (const c of userCampaigns) {
    await saveCampaignSnapshot(c.id, { spent: c.spent, impressions: c.impressions, clicks: c.clicks, conversions: c.conversions, reach: c.reach, ctr: c.ctr, cpc: c.cpc, cpm: c.cpm, roas: c.roas, frequency: c.frequency });
  }
}
