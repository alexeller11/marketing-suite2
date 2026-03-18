import { createMetaAdsService } from "./metaAdsService";
import { getIntegrationCredentials, upsertCampaign, saveCampaignSnapshot, getCampaignsByUserId } from "../db";

export async function syncMetaCampaigns(userId: number, accountId: string): Promise<{ synced: number; errors: string[] }> {
  const creds = await getIntegrationCredentials(userId, "meta");
  if (!creds?.accessToken) throw new Error("Credenciais Meta não encontradas. Configure em Configurações.");
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
          await saveCampaignSnapshot(saved.id, { spent: campaignData.spent, impressions: campaignData.impressions, clicks: campaignData.clicks, conversions: campaignData.conversions, ctr: campaignData.ctr, cpc: campaignData.cpc, roi: campaignData.roi });
          synced++;
        }
      } catch (e) { errors.push(`Campanha ${mc.id}: ${e}`); }
    }
  } catch (e) { throw new Error(`Erro ao buscar campanhas Meta: ${e}`); }
  return { synced, errors };
}

export async function snapshotAllCampaigns(userId: number): Promise<void> {
  const userCampaigns = await getCampaignsByUserId(userId);
  for (const c of userCampaigns) {
    await saveCampaignSnapshot(c.id, { spent: c.spent, impressions: c.impressions, clicks: c.clicks, conversions: c.conversions, ctr: c.ctr, cpc: c.cpc, roi: c.roi });
  }
}
