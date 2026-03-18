import { eq, and, desc, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { InsertUser, users, campaigns, budgetAlerts, integrationCredentials, aiAnalyses, campaignHistory } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _client: postgres.Sql | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _client = postgres(process.env.DATABASE_URL);
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null; _client = null;
    }
  }
  return _db;
}

export async function closeDb() {
  if (_client) { await _client.end(); _client = null; _db = null; }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized; updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCampaignsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaigns).where(eq(campaigns.userId, userId)).orderBy(desc(campaigns.updatedAt));
}

export async function createCampaign(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(campaigns).values(data).returning();
  return result[0];
}

export async function updateCampaign(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(campaigns).set({ ...data, updatedAt: new Date() }).where(eq(campaigns.id, id)).returning();
  return result[0];
}

export async function upsertCampaign(userId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(campaigns)
    .where(and(eq(campaigns.userId, userId), eq(campaigns.externalId, data.externalId), eq(campaigns.platform, data.platform))).limit(1);
  if (existing.length > 0) {
    const result = await db.update(campaigns).set({ ...data, updatedAt: new Date(), syncedAt: new Date() }).where(eq(campaigns.id, existing[0].id)).returning();
    return result[0];
  }
  const result = await db.insert(campaigns).values({ ...data, userId, syncedAt: new Date() }).returning();
  return result[0];
}

export async function getDashboardStats(userId: number, days: number = 30) {
  const db = await getDb();
  if (!db) return null;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const userCampaigns = await db.select().from(campaigns).where(and(eq(campaigns.userId, userId), gte(campaigns.updatedAt, since)));
  const totalSpent = userCampaigns.reduce((s, c) => s + parseFloat(c.spent?.toString() || "0"), 0);
  const totalImpressions = userCampaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const totalClicks = userCampaigns.reduce((s, c) => s + (c.clicks || 0), 0);
  const totalConversions = userCampaigns.reduce((s, c) => s + (c.conversions || 0), 0);
  const avgCtr = totalClicks > 0 && totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpc = totalClicks > 0 ? totalSpent / totalClicks : 0;
  const byPlatform: Record<string, { spent: number; impressions: number; clicks: number; conversions: number }> = {};
  for (const c of userCampaigns) {
    if (!byPlatform[c.platform]) byPlatform[c.platform] = { spent: 0, impressions: 0, clicks: 0, conversions: 0 };
    byPlatform[c.platform].spent += parseFloat(c.spent?.toString() || "0");
    byPlatform[c.platform].impressions += c.impressions || 0;
    byPlatform[c.platform].clicks += c.clicks || 0;
    byPlatform[c.platform].conversions += c.conversions || 0;
  }
  return { totalSpent, totalImpressions, totalClicks, totalConversions, avgCtr, avgCpc, byPlatform, campaigns: userCampaigns };
}

export async function saveCampaignSnapshot(campaignId: number, data: any) {
  const db = await getDb();
  if (!db) return;
  await db.insert(campaignHistory).values({ campaignId, ...data, recordedAt: new Date() });
}

export async function getCampaignHistory(campaignId: number, days: number = 30) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db.select().from(campaignHistory).where(and(eq(campaignHistory.campaignId, campaignId), gte(campaignHistory.recordedAt, since))).orderBy(desc(campaignHistory.recordedAt));
}

export async function getBudgetAlertsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(budgetAlerts).where(eq(budgetAlerts.userId, userId));
}

export async function createBudgetAlert(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(budgetAlerts).values(data).returning();
  return result[0];
}

export async function deleteBudgetAlert(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(budgetAlerts).where(and(eq(budgetAlerts.id, id), eq(budgetAlerts.userId, userId)));
}

export async function checkBudgetAlerts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const alerts = await db.select().from(budgetAlerts).where(and(eq(budgetAlerts.userId, userId), eq(budgetAlerts.isActive, true)));
  const triggered = [];
  for (const alert of alerts) {
    if (!alert.campaignId) continue;
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, alert.campaignId)).limit(1);
    if (!campaign) continue;
    const spentPct = campaign.budget ? (parseFloat(campaign.spent?.toString() || "0") / parseFloat(campaign.budget.toString())) * 100 : 0;
    if (spentPct >= parseFloat(alert.threshold.toString())) {
      triggered.push({ alert, campaign, spentPct });
      await db.update(budgetAlerts).set({ lastTriggered: new Date() }).where(eq(budgetAlerts.id, alert.id));
    }
  }
  return triggered;
}

export async function getIntegrationCredentials(userId: number, platform: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(integrationCredentials)
    .where(and(eq(integrationCredentials.userId, userId), eq(integrationCredentials.platform, platform as any), eq(integrationCredentials.isActive, true))).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function saveIntegrationCredentials(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(integrationCredentials)
    .where(and(eq(integrationCredentials.userId, data.userId), eq(integrationCredentials.platform, data.platform))).limit(1);
  if (existing.length > 0) {
    const result = await db.update(integrationCredentials).set({ ...data, updatedAt: new Date() }).where(eq(integrationCredentials.id, existing[0].id)).returning();
    return result[0];
  }
  const result = await db.insert(integrationCredentials).values(data).returning();
  return result[0];
}

export async function saveAiAnalysis(data: { userId: number; campaignId?: number; prompt: string; analysis: string; recommendations: any }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(aiAnalyses).values(data).returning();
  return result[0];
}

export async function getAiAnalysesByUser(userId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiAnalyses).where(eq(aiAnalyses.userId, userId)).orderBy(desc(aiAnalyses.createdAt)).limit(limit);
}
