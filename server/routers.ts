import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getCampaignsByUserId, createCampaign, updateCampaign,
  getClientsByUserId, upsertClient, updateClient, getClientStats,
  getAdAccountsByUserId, upsertAdAccount, setAdAccountSelected, assignAdAccountToClient,
  getBudgetAlertsByUserId, createBudgetAlert, deleteBudgetAlert, checkBudgetAlerts,
  getIntegrationCredentials, saveIntegrationCredentials,
  getDashboardStats, getCampaignHistory, saveCampaignSnapshot,
  saveAiAnalysis, getAiAnalysesByUser, getAiAnalysesByClient
} from "./db";
import { createGroqService } from "./services/groqService";
import { syncGoogleAdsCampaigns } from "./services/syncService";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  dashboard: router({
    stats: protectedProcedure
      .input(z.object({ days: z.number().default(30) }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return getDashboardStats(ctx.user.id, input.days);
      }),
  }),

  clients: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      return getClientsByUserId(ctx.user.id);
    }),
    stats: protectedProcedure
      .input(z.object({ days: z.number().default(30) }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return getClientStats(ctx.user.id, input.days);
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const clients = await getClientsByUserId(ctx.user.id);
        return clients.find(c => c.id === input.id) || null;
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        monthlyBudget: z.number().optional(),
        paymentMethod: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { id, ...data } = input;
        return updateClient(id, ctx.user.id, data as any);
      }),
    campaigns: protectedProcedure
      .input(z.object({ clientId: z.number(), status: z.string().optional(), days: z.number().default(30) }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return getCampaignsByUserId(ctx.user.id, { clientId: input.clientId, status: input.status });
      }),
    aiHistory: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return getAiAnalysesByClient(input.clientId);
      }),
  }),

  adAccounts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      return getAdAccountsByUserId(ctx.user.id);
    }),
    setSelected: protectedProcedure
      .input(z.object({ id: z.number(), selected: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        await setAdAccountSelected(input.id, ctx.user.id, input.selected);
        return { success: true };
      }),
    assignClient: protectedProcedure
      .input(z.object({ adAccountId: z.number(), clientId: z.number().nullable() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        await assignAdAccountToClient(input.adAccountId, input.clientId, ctx.user.id);
        return { success: true };
      }),
  }),

  campaigns: router({
    list: protectedProcedure
      .input(z.object({ clientId: z.number().optional(), status: z.string().optional(), adAccountId: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return getCampaignsByUserId(ctx.user.id, input);
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), status: z.enum(["active", "paused", "completed", "draft"]).optional(), budget: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { id, ...data } = input;
        return updateCampaign(id, data);
      }),
    history: protectedProcedure
      .input(z.object({ campaignId: z.number(), days: z.number().default(30) }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return getCampaignHistory(input.campaignId, input.days);
      }),
  }),

  sync: router({
    google: protectedProcedure
      .input(z.object({ customerId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return syncGoogleAdsCampaigns(ctx.user.id, input.customerId);
      }),
    status: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const google = await getIntegrationCredentials(ctx.user.id, "google");
      return {
        google: { connected: !!google?.accessToken },
      };
    }),
  }),

  budgetAlerts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      return getBudgetAlertsByUserId(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({ campaignId: z.number().optional(), clientId: z.number().optional(), threshold: z.number().min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return createBudgetAlert({ userId: ctx.user.id, ...input });
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        await deleteBudgetAlert(input.id, ctx.user.id);
        return { success: true };
      }),
    check: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      return checkBudgetAlerts(ctx.user.id);
    }),
  }),

  integrations: router({
    getCredentials: protectedProcedure
      .input(z.enum(["meta", "google", "instagram"]))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const creds = await getIntegrationCredentials(ctx.user.id, input);
        return creds ? { connected: true, platform: input, updatedAt: creds.updatedAt } : { connected: false, platform: input };
      }),
    saveCredentials: protectedProcedure
      .input(z.object({ platform: z.enum(["meta", "google", "instagram"]), accessToken: z.string().optional(), refreshToken: z.string().optional(), accountId: z.string().optional(), metadata: z.record(z.string(), z.any()).optional() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return saveIntegrationCredentials({ userId: ctx.user.id, ...input, isActive: true });
      }),
  }),

  ai: router({
    analyzeClient: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        period: z.string().default("últimos 30 dias"),
        days: z.number().default(30),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const clients = await getClientsByUserId(ctx.user.id);
        const client = clients.find(c => c.id === input.clientId);
        if (!client) throw new Error("Cliente não encontrado");
        const campaigns = await getCampaignsByUserId(ctx.user.id, { clientId: input.clientId });
        const totalSpent = campaigns.reduce((s, c) => s + parseFloat(c.spent?.toString() || "0"), 0);
        const groq = createGroqService();
        const analysis = await groq.analyzeClientFull({
          clientName: client.name,
          platform: client.platform,
          period: input.period,
          totalSpent,
          monthlyBudget: parseFloat(client.monthlyBudget?.toString() || "0"),
          campaigns: campaigns.map(c => ({
            name: c.name,
            status: c.status,
            metrics: {
              spent: parseFloat(c.spent?.toString() || "0"),
              impressions: c.impressions || 0,
              clicks: c.clicks || 0,
              conversions: c.conversions || 0,
              reach: c.reach || 0,
              ctr: parseFloat(c.ctr?.toString() || "0"),
              cpc: parseFloat(c.cpc?.toString() || "0"),
              cpm: parseFloat(c.cpm?.toString() || "0"),
              roas: parseFloat(c.roas?.toString() || "0"),
              frequency: parseFloat(c.frequency?.toString() || "0"),
              costPerResult: parseFloat(c.costPerResult?.toString() || "0"),
            },
          })),
        });
        await saveAiAnalysis({
          userId: ctx.user.id,
          clientId: input.clientId,
          type: "client",
          prompt: `Análise completa: ${client.name}`,
          analysis: analysis.analysis,
          recommendations: [...analysis.recommendations, ...analysis.optimizations],
          score: analysis.score,
        });
        return analysis;
      }),

    analyzeCampaign: protectedProcedure
      .input(z.object({
        campaignName: z.string(),
        campaignId: z.number().optional(),
        clientId: z.number().optional(),
        platform: z.string(),
        metrics: z.object({
          spent: z.number(), impressions: z.number(), clicks: z.number(),
          conversions: z.number(), reach: z.number().default(0),
          ctr: z.number(), cpc: z.number(), cpm: z.number().default(0),
          roas: z.number().default(0), frequency: z.number().default(0),
          costPerResult: z.number().default(0),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const groq = createGroqService();
        const analysis = await groq.analyzeCampaign(input);
        await saveAiAnalysis({
          userId: ctx.user.id,
          clientId: input.clientId,
          campaignId: input.campaignId,
          type: "campaign",
          prompt: `${input.campaignName} - ${input.platform}`,
          analysis: analysis.analysis,
          recommendations: [...analysis.recommendations, ...analysis.optimizations],
          score: analysis.score,
        });
        return analysis;
      }),

    history: protectedProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return getAiAnalysesByUser(ctx.user.id, input.limit);
      }),
  }),
});

export type AppRouter = typeof appRouter;
