import axios from "axios";
import { ENV } from "../_core/env";

const META_API_VERSION = "v18.0";
const META_API_BASE_URL = `https://graph.instagram.com/${META_API_VERSION}`;

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  daily_budget?: number;
  lifetime_budget?: number;
  start_time?: string;
  stop_time?: string;
  insights?: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
  };
}

export interface MetaAdsServiceConfig {
  accessToken: string;
  appId: string;
  appSecret: string;
}

class MetaAdsService {
  private config: MetaAdsServiceConfig;

  constructor(config: MetaAdsServiceConfig) {
    this.config = config;
  }

  /**
   * Obter campanhas do usuário
   */
  async getCampaigns(accountId: string): Promise<MetaCampaign[]> {
    try {
      const response = await axios.get(
        `${META_API_BASE_URL}/${accountId}/campaigns`,
        {
          params: {
            access_token: this.config.accessToken,
            fields: "id,name,status,daily_budget,lifetime_budget,start_time,stop_time",
          },
        }
      );

      return response.data.data || [];
    } catch (error) {
      console.error("[Meta Ads] Error fetching campaigns:", error);
      throw error;
    }
  }

  /**
   * Obter insights de uma campanha
   */
  async getCampaignInsights(campaignId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${META_API_BASE_URL}/${campaignId}/insights`,
        {
          params: {
            access_token: this.config.accessToken,
            fields: "spend,impressions,clicks,actions,action_values",
            time_range: JSON.stringify({
              since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
              until: new Date().toISOString().split("T")[0],
            }),
          },
        }
      );

      return response.data.data || [];
    } catch (error) {
      console.error("[Meta Ads] Error fetching campaign insights:", error);
      throw error;
    }
  }

  /**
   * Criar nova campanha
   */
  async createCampaign(
    accountId: string,
    campaignData: {
      name: string;
      objective: string;
      status: string;
      daily_budget?: number;
    }
  ): Promise<{ id: string }> {
    try {
      const response = await axios.post(
        `${META_API_BASE_URL}/${accountId}/campaigns`,
        {
          name: campaignData.name,
          objective: campaignData.objective,
          status: campaignData.status,
          daily_budget: campaignData.daily_budget,
        },
        {
          params: {
            access_token: this.config.accessToken,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("[Meta Ads] Error creating campaign:", error);
      throw error;
    }
  }

  /**
   * Atualizar campanha
   */
  async updateCampaign(
    campaignId: string,
    updates: {
      name?: string;
      status?: string;
      daily_budget?: number;
    }
  ): Promise<{ success: boolean }> {
    try {
      const response = await axios.post(
        `${META_API_BASE_URL}/${campaignId}`,
        updates,
        {
          params: {
            access_token: this.config.accessToken,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("[Meta Ads] Error updating campaign:", error);
      throw error;
    }
  }

  /**
   * Obter token de acesso usando refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      const response = await axios.get(
        `${META_API_BASE_URL}/oauth/access_token`,
        {
          params: {
            grant_type: "fb_exchange_token",
            client_id: this.config.appId,
            client_secret: this.config.appSecret,
            fb_exchange_token: refreshToken,
          },
        }
      );

      return response.data.access_token;
    } catch (error) {
      console.error("[Meta Ads] Error refreshing access token:", error);
      throw error;
    }
  }
}

export function createMetaAdsService(): MetaAdsService {
  return new MetaAdsService({
    accessToken: process.env.META_ACCESS_TOKEN || "",
    appId: process.env.META_APP_ID || "",
    appSecret: process.env.META_APP_SECRET || "",
  });
}

export default MetaAdsService;
