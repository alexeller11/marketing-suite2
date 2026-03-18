import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getCampaignsByUserId, createCampaign, updateCampaign, upsertCampaign,
  getBudgetAlertsByUserId, createBudgetAlert, deleteBudgetAlert, checkBudgetAlerts,
  getIntegrationCredentials, saveIntegrationCredentials,
  getDashboardStats, getCampaignHistory, saveCampaignSnapshot,
  saveAiAnalysis, getAiAnalysesByUser
} from "./db";
import { createGroqService } from "./services/groqService";
import { syncMetaCampaigns } from "./services/syncService";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
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
  campaigns: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      return getCampaignsByUserId(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({ name: z.string(), platform: z.enum(["meta", "google", "instagram"]), externalId: z.string(), budget: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return createCampaign({ userId: ctx.user.id, ...input });
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), status: z.enum(["active", "paused", "completed", "draft"]).optional(), budget: z.number().optional(), spent: z.number().optional(), impressions: z.number().optional(), clicks: z.number().optional(), conversions: z.number().optional(), ctr: z.number().optional(), cpc: z.number().optional(), roi: z.number().optional() }))
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
    snapshot: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const campaigns = await getCampaignsByUserId(ctx.user.id);
        const campaign = campaigns.find(c => c.id === input.campaignId);
        if (!campaign) throw new Error("Campanha não encontrada");
        await saveCampaignSnapshot(campaign.id, { spent: campaign.spent, impressions: campaign.impressions, clicks: campaign.clicks, conversions: campaign.conversions, ctr: campaign.ctr, cpc: campaign.cpc, roi: campaign.roi });
        return { success: true };
      }),
  }),
  sync: router({
    meta: protectedProcedure
      .input(z.object({ accountId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return syncMetaCampaigns(ctx.user.id, input.accountId);
      }),
  }),
  budgetAlerts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      return getBudgetAlertsByUserId(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({ campaignId: z.number().optional(), threshold: z.number().min(1).max(100) }))
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
    analyzeCampaign: protectedProcedure
      .input(z.object({ campaignName: z.string(), campaignId: z.number().optional(), platform: z.string(), metrics: z.object({ spent: z.number(), impressions: z.number(), clicks: z.number(), conversions: z.number(), ctr: z.number(), cpc: z.number(), roi: z.number() }) }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const groq = createGroqService();
        const analysis = await groq.analyzeCampaign(input);
        await saveAiAnalysis({ userId: ctx.user.id, campaignId: input.campaignId, prompt: `${input.campaignName} - ${input.platform}`, analysis: analysis.analysis, recommendations: analysis.recommendations });
        return analysis;
      }),
    getRecommendations: protectedProcedure
      .input(z.object({ campaignName: z.string(), metrics: z.object({ spent: z.number(), impressions: z.number(), clicks: z.number(), conversions: z.number(), ctr: z.number(), cpc: z.number(), roi: z.number() }) }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const groq = createGroqService();
        return groq.generateOptimizationRecommendations(input.campaignName, input.metrics);
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
