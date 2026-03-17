import { pgTable, pgEnum, serial, text, varchar, timestamp, integer, decimal, boolean, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const campaignStatusEnum = pgEnum("campaign_status", ["active", "paused", "completed", "draft"]);
export const platformEnum = pgEnum("platform", ["meta", "google", "instagram"]);

export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { mode: "date" }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Campanhas de Marketing
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  platform: platformEnum("platform").notNull(),
  externalId: varchar("external_id", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  status: campaignStatusEnum("status").default("draft").notNull(),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  spent: decimal("spent", { precision: 12, scale: 2 }).default("0"),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  conversions: integer("conversions").default(0),
  ctr: decimal("ctr", { precision: 5, scale: 2 }).default("0"),
  cpc: decimal("cpc", { precision: 10, scale: 4 }).default("0"),
  roi: decimal("roi", { precision: 5, scale: 2 }).default("0"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  syncedAt: timestamp("synced_at", { mode: "date" }),
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

// Histórico de Campanhas
export const campaignHistory = pgTable("campaign_history", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  spent: decimal("spent", { precision: 12, scale: 2 }),
  impressions: integer("impressions"),
  clicks: integer("clicks"),
  conversions: integer("conversions"),
  ctr: decimal("ctr", { precision: 5, scale: 2 }),
  cpc: decimal("cpc", { precision: 10, scale: 4 }),
  roi: decimal("roi", { precision: 5, scale: 2 }),
  recordedAt: timestamp("recorded_at", { mode: "date" }).defaultNow().notNull(),
});

export type CampaignHistory = typeof campaignHistory.$inferSelect;
export type InsertCampaignHistory = typeof campaignHistory.$inferInsert;

// Alertas de Orçamento
export const budgetAlerts = pgTable("budget_alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }),
  threshold: decimal("threshold", { precision: 5, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastTriggered: timestamp("last_triggered", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export type BudgetAlert = typeof budgetAlerts.$inferSelect;
export type InsertBudgetAlert = typeof budgetAlerts.$inferInsert;

// Credenciais de Integração
export const integrationCredentials = pgTable("integration_credentials", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  platform: platformEnum("platform").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  metadata: json("metadata"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export type IntegrationCredential = typeof integrationCredentials.$inferSelect;
export type InsertIntegrationCredential = typeof integrationCredentials.$inferInsert;

// Análises de IA
export const aiAnalyses = pgTable("ai_analyses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  analysis: text("analysis").notNull(),
  recommendations: json("recommendations"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export type AiAnalysis = typeof aiAnalyses.$inferSelect;
export type InsertAiAnalysis = typeof aiAnalyses.$inferInsert;

// Relações
export const usersRelations = relations(users, ({ many }) => ({
  campaigns: many(campaigns),
  budgetAlerts: many(budgetAlerts),
  integrationCredentials: many(integrationCredentials),
  aiAnalyses: many(aiAnalyses),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  user: one(users, { fields: [campaigns.userId], references: [users.id] }),
  history: many(campaignHistory),
  budgetAlerts: many(budgetAlerts),
  aiAnalyses: many(aiAnalyses),
}));

export const campaignHistoryRelations = relations(campaignHistory, ({ one }) => ({
  campaign: one(campaigns, { fields: [campaignHistory.campaignId], references: [campaigns.id] }),
}));

export const budgetAlertsRelations = relations(budgetAlerts, ({ one }) => ({
  user: one(users, { fields: [budgetAlerts.userId], references: [users.id] }),
  campaign: one(campaigns, { fields: [budgetAlerts.campaignId], references: [campaigns.id] }),
}));

export const integrationCredentialsRelations = relations(integrationCredentials, ({ one }) => ({
  user: one(users, { fields: [integrationCredentials.userId], references: [users.id] }),
}));

export const aiAnalysesRelations = relations(aiAnalyses, ({ one }) => ({
  user: one(users, { fields: [aiAnalyses.userId], references: [users.id] }),
  campaign: one(campaigns, { fields: [aiAnalyses.campaignId], references: [campaigns.id] }),
}));