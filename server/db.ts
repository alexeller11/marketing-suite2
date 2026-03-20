import { eq, and, desc, gte, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  InsertUser, users, campaigns, budgetAlerts, integrationCredentials,
  aiAnalyses, campaignHistory, clients, adAccounts,
  type Client, type AdAccount, type Campaign
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _client: postgres.Sql | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _client = postgres(process.env.DATABASE_URL, { ssl: 'require' });
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
  if (!user.openId) throw new Error("User openId is required");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach(field => {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  });
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getClientsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clients).where(and(eq(clients.userId, userId), eq(clients.isActive, true))).orderBy(clients.name);
}

export async function upsertClient(userId: number, data: { externalId: string; name: string; platform: string; metadata?: any }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db.select().from(clients)
    .where(and(eq(clients.userId, userId), eq(clients.externalId, data.externalId))).limit(1);
  if (existing.length > 0) {
    const result = await db.update(clients).set({ name: data.name, metadata: data.metadata, updatedAt: new Date() })
      .where(eq(clients.id, existing[0].id)).returning();
    return result[0];
  }
  const result = await db.insert(clients).values({ userId, ...data, platform: data.platform as any, isActive: true }).returning();
  return result[0];
}

export async function updateClient(id: number, userId: number, data: Partial<Client>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.update(clients).set({ ...data, updatedAt: new Date() })
    .where(and(eq(clients.id, id), eq(clients.userId, userId))).returning();
  return result[0];
}

export async function getAdAccountsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(adAccounts).where(eq(adAccounts.userId, userId)).orderBy(adAccounts.name);
}

export async function upsertAdAccount(userId: number, data: { externalId: string; name: string; platform: string; currency?: string; accountStatus?: number; clientId?: number; metadata?: any }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db.select().from(adAccounts)
    .where(and(eq(adAccounts.userId, userId), eq(adAccounts.externalId, data.externalId))).limit(1);
  if (existing.length > 0) {
    const result = await db.update(adAccounts).set({ name: data.name, currency: data.currency, accountStatus: data.accountStatus, clientId: data.clientId ?? existing[0].clientId, metadata: data.metadata, updatedAt: new Date() })
      .where(eq(adAccounts.id, existing[0].id)).returning();
    return result[0];
  }
  const result = await db.insert(adAccounts).values({ userId, ...data, platform: data.platform as any, isSelected: false }).returning();
  return result[0];
}

export async function setAdAccountSelected(id: number, userId: number, selected: boolean) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(adAccounts).set({ isSelected: selected }).where(and(eq(adAccounts.id, id), eq(adAccounts.userId, userId)));
}

export async function assignAdAccountToClient(adAccountId: number, clientId: number | null, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(adAccounts).set({ clientId, updatedAt: new Date() }).where(and(eq(adAccounts.id, adAccountId), eq(adAccounts.userId, userId)));
}

export async function getCampaignsByUserId(userId: number, filters?: { clientId?: number; status?: string; adAccountId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(campaigns.userId, userId)];
  if (filters?.clientId) conditions.push(eq(campaigns.clientId, filters.clientId));
  if (filters?.adAccountId) conditions.push(eq(campaigns.adAccountId, filters.adAccountId));
  if (filters?.status && filters.status !== "all") conditions.push(eq(campaigns.status, filters.status as any));
  return db.select().from(campaigns).where(and(...conditions)).orderBy(desc(campaigns.updatedAt));
}

export async function createCampaign(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(campaigns).values(data).returning();
  return result[0];
}

export async function updateCampaign(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.update(campaigns).set({ ...data, updatedAt: new Date() }).where(eq(campaigns.id, id)).returning();
  return result[0];
}

export async function upsertCampaign(userId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
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
  const totalReach = userCampaigns.reduce((s, c) => s + (c.reach || 0), 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpc = totalClicks > 0 ? totalSpent / totalClicks : 0;
  const avgRoas = userCampaigns.reduce((s, c) => s + parseFloat(c.roas?.toString() || "0"), 0) / (userCampaigns.length || 1);
  const byPlatform: Record<string, any> = {};
  for (const c of userCampaigns) {
    if (!byPlatform[c.platform]) byPlatform[c.platform] = { spent: 0, impressions: 0, clicks: 0, conversions: 0 };
    byPlatform[c.platform].spent += parseFloat(c.spent?.toString() || "0");
    byPlatform[c.platform].impressions += c.impressions || 0;
    byPlatform[c.platform].clicks += c.clicks || 0;
    byPlatform[c.platform].conversions += c.conversions || 0;
  }
  const clientStats = await getClientStats(userId, days);
  return { totalSpent, totalImpressions, totalClicks, totalConversions, totalReach, avgCtr, avgCpc, avgRoas, byPlatform, campaigns: userCampaigns, clientStats };
}

export async function getClientStats(userId: number, days: number = 30) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const userClients = await db.select().from(clients).where(and(eq(clients.userId, userId), eq(clients.isActive, true)));
  const stats = [];
  for (const client of userClients) {
    const clientCampaigns = await db.select().from(campaigns).where(and(eq(campaigns.userId, userId), eq(campaigns.clientId, client.id), gte(campaigns.updatedAt, since)));
    const spent = clientCampaigns.reduce((s, c) => s + parseFloat(c.spent?.toString() || "0"), 0);
    const impressions = clientCampaigns.reduce((s, c) => s + (c.impressions || 0), 0);
    const clicks = clientCampaigns.reduce((s, c) => s + (c.clicks || 0), 0);
    const conversions = clientCampaigns.reduce((s, c) => s + (c.conversions || 0), 0);
    const activeCampaigns = clientCampaigns.filter(c => c.status === "active").length;
    stats.push({ client, spent, impressions, clicks, conversions, activeCampaigns, totalCampaigns: clientCampaigns.length });
  }
  return stats.sort((a, b) => b.spent - a.spent);
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
  if (!db) throw new Error("DB not available");
  const result = await db.insert(budgetAlerts).values(data).returning();
  return result[0];
}

export async function deleteBudgetAlert(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
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
  return result[0] || null;
}

export async function saveIntegrationCredentials(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db.select().from(integrationCredentials)
    .where(and(eq(integrationCredentials.userId, data.userId), eq(integrationCredentials.platform, data.platform))).limit(1);
  if (existing.length > 0) {
    const result = await db.update(integrationCredentials).set({ ...data, updatedAt: new Date() }).where(eq(integrationCredentials.id, existing[0].id)).returning();
    return result[0];
  }
  const result = await db.insert(integrationCredentials).values(data).returning();
  return result[0];
}

export async function saveAiAnalysis(data: { userId: number; clientId?: number; campaignId?: number; type?: string; prompt: string; analysis: string; recommendations: any; score?: number }) {
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

export async function getAiAnalysesByClient(clientId: number, limit: number = 5) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiAnalyses).where(eq(aiAnalyses.clientId, clientId)).orderBy(desc(aiAnalyses.createdAt)).limit(limit);
}
