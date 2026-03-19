import { createMetaAdsService } from "./metaAdsService";
import {
  getIntegrationCredentials, upsertCampaign, saveCampaignSnapshot,
  getCampaignsByUserId, upsertClient, upsertAdAccount, getAdAccountsByUserId
} from "../db";
import axios from "axios";
import { OAuth2Client } from "google-auth-library";

// Sincroniza Business Managers e Ad Accounts do Meta (sem importar campanhas ainda)
export async function syncMetaStructure(userId: number): Promise<{ businesses: number; accounts: number; errors: string[] }> {
  const creds = await getIntegrationCredentials(userId, "meta");
  if (!creds?.accessToken) throw new Error("Meta não conectado.");
  const service = createMetaAdsService(creds.accessToken);
  const errors: string[] = [];
  let businessCount = 0;
  let accountCount = 0;

  try {
    // Busca Business Managers
    const businesses = await service.getBusinessManagers();
    for (const biz of businesses) {
      try {
        const client = await upsertClient(userId, {
          externalId: biz.id,
          name: biz.name,
          platform: "meta",
          metadata: { profilePicture: biz.profile_picture_uri },
        });
        businessCount++;
        // Busca ad accounts do Business Manager
        const bizAccounts = await service.getBusinessAdAccounts(biz.id);
        for (const acc of bizAccounts) {
          await upsertAdAccount(userId, {
            externalId: acc.id,
            name: acc.name,
            platform: "meta",
            currency: acc.currency,
            accountStatus: acc.account_status,
            clientId: client.id,
            metadata: { amountSpent: acc.amount_spent },
          });
          accountCount++;
        }
      } catch (e) { errors.push(`Biz ${biz.name}: ${e}`); }
    }

    // Também busca contas avulsas (sem Business Manager)
    const allAccounts = await service.getAllAdAccounts();
    for (const acc of allAccounts) {
      try {
        await upsertAdAccount(userId, {
          externalId: acc.id,
          name: acc.name,
          platform: "meta",
          currency: acc.currency,
          accountStatus: acc.account_status,
          clientId: acc.business ? undefined : undefined, // já vinculado acima
          metadata: { amountSpent: acc.amount_spent, businessId: acc.business?.id },
        });
        accountCount++;
      } catch (e) { errors.push(`Conta ${acc.name}: ${e}`); }
    }
  } catch (e) { errors.push(`Estrutura Meta: ${e}`); }

  return { businesses: businessCount, accounts: accountCount, errors };
}

// Sincroniza campanhas de uma Ad Account específica
export async function syncMetaCampaigns(userId: number, accountId: string, adAccountDbId?: number): Promise<{ synced: number; errors: string[] }> {
  const creds = await getIntegrationCredentials(userId, "meta");
  if (!creds?.accessToken) throw new Error("Meta não conectado.");
  const service = createMetaAdsService(creds.accessToken);
  const errors: string[] = [];
  let synced = 0;

  // Busca clientId da ad account
  const accounts = await getAdAccountsByUserId(userId);
  const adAccount = accounts.find(a => a.externalId === accountId);
  const clientId = adAccount?.clientId || null;

  try {
    const metaCampaigns = await service.getCampaigns(accountId);
    for (const mc of metaCampaigns) {
      try {
        const insights = await service.getCampaignInsights(mc.id);
        const actions = insights?.actions || [];
        const conversions = actions.find((a: any) => ["purchase", "lead", "complete_registration", "offsite_conversion"].some(t => a.action_type?.includes(t)))?.value || 0;
        const actionValues = insights?.action_values || [];
        const revenue = actionValues.find((a: any) => a.action_type?.includes("purchase"))?.value || 0;
        const spent = parseFloat(insights?.spend || "0");
        const roas = spent > 0 && revenue > 0 ? parseFloat(revenue) / spent : 0;

        const campaignData = {
          externalId: mc.id,
          platform: "meta" as const,
          name: mc.name,
          clientId,
          adAccountId: adAccountDbId || adAccount?.id || null,
          objective: mc.objective || null,
          status: mc.status?.toLowerCase() === "active" ? "active" : mc.status?.toLowerCase() === "paused" ? "paused" : "draft",
          budget: mc.daily_budget ? mc.daily_budget / 100 : mc.lifetime_budget ? mc.lifetime_budget / 100 : null,
          spent,
          impressions: parseInt(insights?.impressions || "0"),
          clicks: parseInt(insights?.clicks || "0"),
          reach: parseInt(insights?.reach || "0"),
          conversions: parseInt(String(conversions)),
          ctr: parseFloat(insights?.ctr || "0"),
          cpc: parseFloat(insights?.cpc || "0"),
          cpm: parseFloat(insights?.cpm || "0"),
          frequency: parseFloat(insights?.frequency || "0"),
          roas,
          costPerResult: parseInt(String(conversions)) > 0 ? spent / parseInt(String(conversions)) : 0,
          startDate: mc.start_time ? new Date(mc.start_time) : null,
          endDate: mc.stop_time ? new Date(mc.stop_time) : null,
        };

        const saved = await upsertCampaign(userId, campaignData);
        if (saved) {
          await saveCampaignSnapshot(saved.id, {
            spent: campaignData.spent, impressions: campaignData.impressions,
            clicks: campaignData.clicks, conversions: campaignData.conversions,
            reach: campaignData.reach, ctr: campaignData.ctr, cpc: campaignData.cpc,
            cpm: campaignData.cpm, roas: campaignData.roas, frequency: campaignData.frequency,
          });
          synced++;
        }
      } catch (e) { errors.push(`Campanha ${mc.name}: ${e}`); }
    }
  } catch (e) { throw new Error(`Erro Meta: ${e}`); }
  return { synced, errors };
}

// Sincroniza todas as ad accounts selecionadas
export async function syncSelectedAccounts(userId: number): Promise<{ synced: number; errors: string[] }> {
  const accounts = await getAdAccountsByUserId(userId);
  const selected = accounts.filter(a => a.isSelected && a.platform === "meta");
  if (selected.length === 0) throw new Error("Nenhuma conta selecionada. Selecione contas em Configurações.");
  let totalSynced = 0;
  const allErrors: string[] = [];
  for (const acc of selected) {
    try {
      const result = await syncMetaCampaigns(userId, acc.externalId, acc.id);
      totalSynced += result.synced;
      allErrors.push(...result.errors);
    } catch (e) { allErrors.push(`${acc.name}: ${e}`); }
  }
  return { synced: totalSynced, errors: allErrors };
}

export async function syncGoogleAdsCampaigns(userId: number, customerId: string): Promise<{ synced: number; errors: string[] }> {
  const creds = await getIntegrationCredentials(userId, "google");
  if (!creds?.accessToken) throw new Error("Google Ads não conectado.");
  const devToken = process.env.GOOGLE_API_KEY || '';
  const oauthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  oauthClient.setCredentials({ access_token: creds.accessToken, refresh_token: creds.refreshToken || undefined });
  const { credentials } = await oauthClient.refreshAccessToken();
  const accessToken = credentials.access_token!;
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
      } catch (e) { errors.push(`Google campaign: ${e}`); }
    }
  } catch (e: any) { throw new Error(`Google Ads: ${e.response?.data?.error?.message || e.message}`); }
  return { synced, errors };
}

export async function snapshotAllCampaigns(userId: number): Promise<void> {
  const userCampaigns = await getCampaignsByUserId(userId);
  for (const c of userCampaigns) {
    await saveCampaignSnapshot(c.id, { spent: c.spent, impressions: c.impressions, clicks: c.clicks, conversions: c.conversions, reach: c.reach, ctr: c.ctr, cpc: c.cpc, cpm: c.cpm, roas: c.roas, frequency: c.frequency });
  }
}
