import axios from "axios";

const META_API_VERSION = "v18.0";
const META_API_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export interface MetaCampaign {
  id: string; name: string; status: string;
  daily_budget?: number; lifetime_budget?: number;
  start_time?: string; stop_time?: string;
}

class MetaAdsService {
  constructor(private accessToken: string) {}

  async getCampaigns(accountId: string): Promise<MetaCampaign[]> {
    const response = await axios.get(`${META_API_BASE_URL}/${accountId}/campaigns`, {
      params: { access_token: this.accessToken, fields: "id,name,status,daily_budget,lifetime_budget,start_time,stop_time" },
    });
    return response.data.data || [];
  }

  async getCampaignInsights(campaignId: string): Promise<any> {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const until = new Date().toISOString().split("T")[0];
    const response = await axios.get(`${META_API_BASE_URL}/${campaignId}/insights`, {
      params: { access_token: this.accessToken, fields: "spend,impressions,clicks,ctr,cpc,actions,action_values", time_range: JSON.stringify({ since, until }) },
    });
    return response.data.data || [];
  }

  async refreshAccessToken(appId: string, appSecret: string, fbExchangeToken: string): Promise<string> {
    const response = await axios.get(`${META_API_BASE_URL}/oauth/access_token`, {
      params: { grant_type: "fb_exchange_token", client_id: appId, client_secret: appSecret, fb_exchange_token: fbExchangeToken },
    });
    return response.data.access_token;
  }
}

export function createMetaAdsService(accessToken?: string): MetaAdsService {
  return new MetaAdsService(accessToken || process.env.META_ACCESS_TOKEN || "");
}

export default MetaAdsService;
