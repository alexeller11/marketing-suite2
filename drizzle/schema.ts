import { pgTable, pgEnum, serial, text, varchar, timestamp, integer, decimal, boolean, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const campaignStatusEnum = pgEnum("campaign_status", ["active", "paused", "completed", "draft"]);
export const platformEnum = pgEnum("platform", ["meta", "google", "instagram"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
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

// Clientes (Business Manager do Meta)
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  externalId: varchar("external_id", { length: 255 }).notNull(), // Business Manager ID
  name: varchar("name", { length: 255 }).notNull(),
  platform: platformEnum("platform").notNull(),
  monthlyBudget: decimal("monthly_budget", { precision: 12, scale: 2 }),
  paymentMethod: varchar("payment_method", { length: 100 }),
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});
export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// Ad Accounts (pertencem a um cliente)
export const adAccounts = pgTable("ad_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
  externalId: varchar("external_id", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  platform: platformEnum("platform").notNull(),
  currency: varchar("currency", { length: 10 }).default("BRL"),
  accountStatus: integer("account_status").default(1),
  isSelected: boolean("is_selected").default(false).notNull(), // selecionada para sync
  metadata: json("metadata"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});
export type AdAccount = typeof adAccounts.$inferSelect;
export type InsertAdAccount = typeof adAccounts.$inferInsert;

// Campanhas
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
  adAccountId: integer("ad_account_id").references(() => adAccounts.id, { onDelete: "set null" }),
  platform: platformEnum("platform").notNull(),
  externalId: varchar("external_id", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  status: campaignStatusEnum("status").default("draft").notNull(),
  objective: varchar("objective", { length: 100 }),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  spent: decimal("spent", { precision: 12, scale: 2 }).default("0"),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  conversions: integer("conversions").default(0),
  reach: integer("reach").default(0),
  ctr: decimal("ctr", { precision: 8, scale: 4 }).default("0"),
  cpc: decimal("cpc", { precision: 10, scale: 4 }).default("0"),
  cpm: decimal("cpm", { precision: 10, scale: 4 }).default("0"),
  roas: decimal("roas", { precision: 10, scale: 4 }).default("0"),
  roi: decimal("roi", { precision: 10, scale: 4 }).default("0"),
  costPerResult: decimal("cost_per_result", { precision: 10, scale: 4 }).default("0"),
  frequency: decimal("frequency", { precision: 8, scale: 4 }).default("0"),
  startDate: timestamp("start_date", { mode: "date" }),
  endDate: timestamp("end_date", { mode: "date" }),
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
  reach: integer("reach"),
  ctr: decimal("ctr", { precision: 8, scale: 4 }),
  cpc: decimal("cpc", { precision: 10, scale: 4 }),
  cpm: decimal("cpm", { precision: 10, scale: 4 }),
  roas: decimal("roas", { precision: 10, scale: 4 }),
  frequency: decimal("frequency", { precision: 8, scale: 4 }),
  recordedAt: timestamp("recorded_at", { mode: "date" }).defaultNow().notNull(),
});
export type CampaignHistory = typeof campaignHistory.$inferSelect;

// Alertas de Orçamento
export const budgetAlerts = pgTable("budget_alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }),
  threshold: decimal("threshold", { precision: 5, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastTriggered: timestamp("last_triggered", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});
export type BudgetAlert = typeof budgetAlerts.$inferSelect;

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

// Análises de IA
export const aiAnalyses = pgTable("ai_analyses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
  campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  type: varchar("type", { length: 50 }).default("campaign"), // campaign | client | comparison
  prompt: text("prompt").notNull(),
  analysis: text("analysis").notNull(),
  recommendations: json("recommendations"),
  score: integer("score"), // 0-100 health score
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});
export type AiAnalysis = typeof aiAnalyses.$inferSelect;

// Relações
export const usersRelations = relations(users, ({ many }) => ({
  campaigns: many(campaigns),
  clients: many(clients),
  adAccounts: many(adAccounts),
  budgetAlerts: many(budgetAlerts),
  integrationCredentials: many(integrationCredentials),
  aiAnalyses: many(aiAnalyses),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, { fields: [clients.userId], references: [users.id] }),
  adAccounts: many(adAccounts),
  campaigns: many(campaigns),
  aiAnalyses: many(aiAnalyses),
  budgetAlerts: many(budgetAlerts),
}));

export const adAccountsRelations = relations(adAccounts, ({ one, many }) => ({
  user: one(users, { fields: [adAccounts.userId], references: [users.id] }),
  client: one(clients, { fields: [adAccounts.clientId], references: [clients.id] }),
  campaigns: many(campaigns),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  user: one(users, { fields: [campaigns.userId], references: [users.id] }),
  client: one(clients, { fields: [campaigns.clientId], references: [clients.id] }),
  adAccount: one(adAccounts, { fields: [campaigns.adAccountId], references: [adAccounts.id] }),
  history: many(campaignHistory),
  budgetAlerts: many(budgetAlerts),
  aiAnalyses: many(aiAnalyses),
}));

export const campaignHistoryRelations = relations(campaignHistory, ({ one }) => ({
  campaign: one(campaigns, { fields: [campaignHistory.campaignId], references: [campaigns.id] }),
}));

export const budgetAlertsRelations = relations(budgetAlerts, ({ one }) => ({
  user: one(users, { fields: [budgetAlerts.userId], references: [users.id] }),
  client: one(clients, { fields: [budgetAlerts.clientId], references: [clients.id] }),
  campaign: one(campaigns, { fields: [budgetAlerts.campaignId], references: [campaigns.id] }),
}));

export const integrationCredentialsRelations = relations(integrationCredentials, ({ one }) => ({
  user: one(users, { fields: [integrationCredentials.userId], references: [users.id] }),
}));

export const aiAnalysesRelations = relations(aiAnalyses, ({ one }) => ({
  user: one(users, { fields: [aiAnalyses.userId], references: [users.id] }),
  client: one(clients, { fields: [aiAnalyses.clientId], references: [clients.id] }),
  campaign: one(campaigns, { fields: [aiAnalyses.campaignId], references: [clients.id] }),
}));
