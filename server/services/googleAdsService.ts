import axios from "axios";

const GOOGLE_ADS_API_VERSION = "v14";
const GOOGLE_ADS_API_BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

export interface GoogleAdsCampaign {
  resourceName: string;
  id: string;
  name: string;
  status: string;
  budget?: {
    budgetId: string;
    amount: number;
  };
  metrics?: {
    impressions: number;
    clicks: number;
    conversions: number;
    costMicros: number;
  };
}

export interface GoogleAdsServiceConfig {
  accessToken: string;
  clientId: string;
  clientSecret: string;
  apiKey: string;
  customerId: string;
}

class GoogleAdsService {
  private config: GoogleAdsServiceConfig;

  constructor(config: GoogleAdsServiceConfig) {
    this.config = config;
  }

  /**
   * Obter campanhas do usuário
   */
  async getCampaigns(): Promise<GoogleAdsCampaign[]> {
    try {
      const query = `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.budget_settings.budget_id,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions_from_interactions,
          metrics.cost_micros
        FROM campaign
        WHERE campaign.status != REMOVED
        ORDER BY campaign.id DESC
      `;

      const response = await axios.post(
        `${GOOGLE_ADS_API_BASE_URL}/customers/${this.config.customerId}/googleAds:search`,
        {
          query,
        },
        {
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            "developer-token": this.config.apiKey,
            "x-goog-api-client": "gl-node/16.0.0 gapic/1.0.0",
          },
        }
      );

      return response.data.results || [];
    } catch (error) {
      console.error("[Google Ads] Error fetching campaigns:", error);
      throw error;
    }
  }

  /**
   * Obter métricas de uma campanha
   */
  async getCampaignMetrics(campaignId: string): Promise<any> {
    try {
      const query = `
        SELECT
          campaign.id,
          campaign.name,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions_from_interactions,
          metrics.cost_micros,
          metrics.ctr,
          metrics.average_cpc
        FROM campaign
        WHERE campaign.id = '${campaignId}'
      `;

      const response = await axios.post(
        `${GOOGLE_ADS_API_BASE_URL}/customers/${this.config.customerId}/googleAds:search`,
        {
          query,
        },
        {
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            "developer-token": this.config.apiKey,
          },
        }
      );

      return response.data.results?.[0] || null;
    } catch (error) {
      console.error("[Google Ads] Error fetching campaign metrics:", error);
      throw error;
    }
  }

  /**
   * Criar nova campanha
   */
  async createCampaign(campaignData: {
    name: string;
    status: string;
    budget: number;
  }): Promise<{ resourceName: string }> {
    try {
      const response = await axios.post(
        `${GOOGLE_ADS_API_BASE_URL}/customers/${this.config.customerId}/campaigns`,
        {
          name: campaignData.name,
          status: campaignData.status,
          budget: {
            amount: campaignData.budget * 1000000, // Convert to micros
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            "developer-token": this.config.apiKey,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("[Google Ads] Error creating campaign:", error);
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
      budget?: number;
    }
  ): Promise<{ success: boolean }> {
    try {
      const response = await axios.patch(
        `${GOOGLE_ADS_API_BASE_URL}/customers/${this.config.customerId}/campaigns/${campaignId}`,
        updates,
        {
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            "developer-token": this.config.apiKey,
          },
        }
      );

      return { success: true };
    } catch (error) {
      console.error("[Google Ads] Error updating campaign:", error);
      throw error;
    }
  }

  /**
   * Obter token de acesso usando refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      const response = await axios.post(
        "https://oauth2.googleapis.com/token",
        {
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }
      );

      return response.data.access_token;
    } catch (error) {
      console.error("[Google Ads] Error refreshing access token:", error);
      throw error;
    }
  }
}

export function createGoogleAdsService(customerId: string): GoogleAdsService {
  return new GoogleAdsService({
    accessToken: process.env.GOOGLE_ACCESS_TOKEN || "",
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    apiKey: process.env.GOOGLE_API_KEY || "",
    customerId,
  });
}

export default GoogleAdsService;
