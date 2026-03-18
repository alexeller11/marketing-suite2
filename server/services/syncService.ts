import { createMetaAdsService } from "./metaAdsService";
import { getIntegrationCredentials, upsertCampaign, saveCampaignSnapshot, getCampaignsByUserId } from "../db";
import axios from "axios";
import { OAuth2Client } from "google-auth-library";

export async function syncMetaCampaigns(userId: number, accountId: string): Promise<{ synced: number; errors: string[] }> {
  const creds = await getIntegrationCredentials(userId, "meta");
  if (!creds?.accessToken) throw new Error("Meta não conectado. Clique em 'Conectar Meta Ads' em Configurações.");
  const service = createMetaAdsService(creds.accessToken);
  const errors: string[] = [];
  let synced = 0;
  try {
    const metaCampaigns = await service.getCampaigns(accountId);
    for (const mc of metaCampaigns) {
      try {
        let insights: any = null;
        try { insights = await service.getCampaignInsights(mc.id); } catch (e) { errors.push(`Insights ${mc.id}: ${e}`); }
        const insightData = insights?.[0] || {};
        const campaignData = {
          externalId: mc.id,
          platform: "meta" as const,
          name: mc.name,
          status: mc.status?.toLowerCase() === "active" ? "active" : mc.status?.toLowerCase() === "paused" ? "paused" : "draft",
          budget: mc.daily_budget ? mc.daily_budget / 100 : null,
          spent: insightData.spend ? parseFloat(insightData.spend) : 0,
          impressions: parseInt(insightData.impressions || "0"),
          clicks: parseInt(insightData.clicks || "0"),
          conversions: 0,
          ctr: insightData.ctr ? parseFloat(insightData.ctr) : 0,
          cpc: insightData.cpc ? parseFloat(insightData.cpc) : 0,
          roi: 0,
        };
        const saved = await upsertCampaign(userId, campaignData);
        if (saved) {
          await saveCampaignSnapshot(saved.id, {
            spent: campaignData.spent, impressions: campaignData.impressions,
            clicks: campaignData.clicks, conversions: campaignData.conversions,
            ctr: campaignData.ctr, cpc: campaignData.cpc, roi: campaignData.roi,
          });
          synced++;
        }
      } catch (e) { errors.push(`Campanha ${mc.id}: ${e}`); }
    }
  } catch (e) { throw new Error(`Erro ao buscar campanhas Meta: ${e}`); }
  return { synced, errors };
}

export async function syncAllMetaAccounts(userId: number): Promise<{ synced: number; errors: string[] }> {
  const creds = await getIntegrationCredentials(userId, "meta");
  if (!creds?.accessToken) throw new Error("Meta não conectado.");
  const meta = creds.metadata as any;
  const adAccounts = meta?.adAccounts || [];
  if (adAccounts.length === 0) throw new Error("Nenhuma conta de anúncios encontrada.");
  let totalSynced = 0;
  const allErrors: string[] = [];
  for (const account of adAccounts) {
    try {
      const result = await syncMetaCampaigns(userId, account.id);
      totalSynced += result.synced;
      allErrors.push(...result.errors);
    } catch (e) { allErrors.push(`Conta ${account.name}: ${e}`); }
  }
  return { synced: totalSynced, errors: allErrors };
}

export async function syncGoogleAdsCampaigns(userId: number, customerId: string): Promise<{ synced: number; errors: string[] }> {
  const creds = await getIntegrationCredentials(userId, "google");
  if (!creds?.accessToken) throw new Error("Google Ads não conectado. Clique em 'Conectar Google Ads' em Configurações.");
  const devToken = process.env.GOOGLE_API_KEY || '';
  const oauthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  oauthClient.setCredentials({ access_token: creds.accessToken, refresh_token: creds.refreshToken || undefined });
  const { credentials } = await oauthClient.refreshAccessToken();
  const accessToken = credentials.access_token!;
  const headers = { Authorization: `Bearer ${accessToken}`, 'developer-token': devToken, 'login-customer-id': customerId };
  const errors: string[] = [];
  let synced = 0;
  try {
    const query = `
      SELECT campaign.id, campaign.name, campaign.status,
        metrics.impressions, metrics.clicks, metrics.conversions, metrics.cost_micros, metrics.ctr, metrics.average_cpc
      FROM campaign
      WHERE segments.date DURING LAST_30_DAYS AND campaign.status != 'REMOVED'
    `;
    const res = await axios.post(
      `https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:search`,
      { query },
      { headers }
    );
    const rows = res.data.results || [];
    for (const row of rows) {
      try {
        const c = row.campaign;
        const m = row.metrics;
        const spent = (m.costMicros || 0) / 1_000_000;
        const campaignData = {
          externalId: c.id,
          platform: "google" as const,
          name: c.name,
          status: c.status?.toLowerCase() === "enabled" ? "active" : c.status?.toLowerCase() === "paused" ? "paused" : "draft",
          budget: null,
          spent,
          impressions: m.impressions || 0,
          clicks: m.clicks || 0,
          conversions: Math.round(m.conversions || 0),
          ctr: (m.ctr || 0) * 100,
          cpc: (m.averageCpc || 0) / 1_000_000,
          roi: 0,
        };
        const saved = await upsertCampaign(userId, campaignData);
        if (saved) {
          await saveCampaignSnapshot(saved.id, {
            spent: campaignData.spent, impressions: campaignData.impressions,
            clicks: campaignData.clicks, conversions: campaignData.conversions,
            ctr: campaignData.ctr, cpc: campaignData.cpc, roi: campaignData.roi,
          });
          synced++;
        }
      } catch (e) { errors.push(`Campanha Google ${row.campaign?.id}: ${e}`); }
    }
  } catch (e: any) {
    throw new Error(`Erro ao buscar campanhas Google Ads: ${e.response?.data?.error?.message || e.message}`);
  }
  return { synced, errors };
}

export async function snapshotAllCampaigns(userId: number): Promise<void> {
  const userCampaigns = await getCampaignsByUserId(userId);
  for (const c of userCampaigns) {
    await saveCampaignSnapshot(c.id, {
      spent: c.spent, impressions: c.impressions, clicks: c.clicks,
      conversions: c.conversions, ctr: c.ctr, cpc: c.cpc, roi: c.roi,
    });
  }
}
