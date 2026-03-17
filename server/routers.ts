import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getCampaignsByUserId, createCampaign, getBudgetAlertsByUserId, getIntegrationCredentials, saveIntegrationCredentials } from "./db";
import { createGroqService } from "./services/groqService";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  campaigns: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      return getCampaignsByUserId(ctx.user.id);
    }),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          platform: z.enum(["meta", "google", "instagram"]),
          externalId: z.string(),
          budget: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return createCampaign({
          userId: ctx.user.id,
          name: input.name,
          platform: input.platform,
          externalId: input.externalId,
          budget: input.budget,
        });
      }),
  }),

  budgetAlerts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      return getBudgetAlertsByUserId(ctx.user.id);
    }),
  }),

  integrations: router({
    getCredentials: protectedProcedure
      .input(z.enum(["meta", "google", "instagram"]))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return getIntegrationCredentials(ctx.user.id, input);
      }),
    saveCredentials: protectedProcedure
      .input(
        z.object({
          platform: z.enum(["meta", "google", "instagram"]),
          accessToken: z.string().optional(),
          refreshToken: z.string().optional(),
          metadata: z.record(z.string(), z.any()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return saveIntegrationCredentials({
          userId: ctx.user.id,
          platform: input.platform,
          accessToken: input.accessToken,
          refreshToken: input.refreshToken,
          metadata: input.metadata,
        });
      }),
  }),

  ai: router({
    analyzeCampaign: protectedProcedure
      .input(
        z.object({
          campaignName: z.string(),
          platform: z.string(),
          metrics: z.object({
            spent: z.number(),
            impressions: z.number(),
            clicks: z.number(),
            conversions: z.number(),
            ctr: z.number(),
            cpc: z.number(),
            roi: z.number(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        try {
          const groqService = createGroqService();
          const analysis = await groqService.analyzeCampaign({
            campaignName: input.campaignName,
            platform: input.platform,
            metrics: input.metrics,
          });
          return analysis;
        } catch (error) {
          console.error("Error analyzing campaign:", error);
          throw error;
        }
      }),
    getRecommendations: protectedProcedure
      .input(
        z.object({
          campaignName: z.string(),
          metrics: z.object({
            spent: z.number(),
            impressions: z.number(),
            clicks: z.number(),
            conversions: z.number(),
            ctr: z.number(),
            cpc: z.number(),
            roi: z.number(),
          }),
        })
      )
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        try {
          const groqService = createGroqService();
          const recommendations = await groqService.generateOptimizationRecommendations(
            input.campaignName,
            input.metrics
          );
          return recommendations;
        } catch (error) {
          console.error("Error getting recommendations:", error);
          throw error;
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
