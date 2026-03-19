import axios from "axios";

const META_API_VERSION = "v18.0";
const BASE = `https://graph.facebook.com/${META_API_VERSION}`;

export interface MetaAdAccount {
  id: string; name: string; account_status: number; currency: string;
  business?: { id: string; name: string };
  amount_spent?: string;
}

export interface MetaCampaign {
  id: string; name: string; status: string; objective?: string;
  daily_budget?: number; lifetime_budget?: number;
  start_time?: string; stop_time?: string;
}

class MetaAdsService {
  constructor(private accessToken: string) {}

  // Busca TODAS as ad accounts com paginação
  async getAllAdAccounts(): Promise<MetaAdAccount[]> {
    const accounts: MetaAdAccount[] = [];
    let url = `${BASE}/me/adaccounts`;
    let params: any = {
      access_token: this.accessToken,
      fields: "id,name,account_status,currency,business,amount_spent",
      limit: 100,
    };
    while (url) {
      const res = await axios.get(url, { params });
      accounts.push(...(res.data.data || []));
      url = res.data.paging?.next || null;
      params = {}; // next já tem os params na URL
    }
    return accounts;
  }

  // Busca Business Managers do usuário
  async getBusinessManagers(): Promise<any[]> {
    try {
      const res = await axios.get(`${BASE}/me/businesses`, {
        params: { access_token: this.accessToken, fields: "id,name,profile_picture_uri" },
      });
      return res.data.data || [];
    } catch { return []; }
  }

  // Busca ad accounts de um Business Manager
  async getBusinessAdAccounts(businessId: string): Promise<MetaAdAccount[]> {
    const accounts: MetaAdAccount[] = [];
    let url = `${BASE}/${businessId}/owned_ad_accounts`;
    let params: any = {
      access_token: this.accessToken,
      fields: "id,name,account_status,currency,amount_spent",
      limit: 100,
    };
    while (url) {
      const res = await axios.get(url, { params });
      accounts.push(...(res.data.data || []));
      url = res.data.paging?.next || null;
      params = {};
    }
    return accounts;
  }

  async getCampaigns(accountId: string): Promise<MetaCampaign[]> {
    const campaigns: MetaCampaign[] = [];
    let url = `${BASE}/${accountId}/campaigns`;
    let params: any = {
      access_token: this.accessToken,
      fields: "id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time",
      limit: 100,
    };
    while (url) {
      const res = await axios.get(url, { params });
      campaigns.push(...(res.data.data || []));
      url = res.data.paging?.next || null;
      params = {};
    }
    return campaigns;
  }

  async getCampaignInsights(campaignId: string, datePreset: string = "last_30d"): Promise<any> {
    try {
      const res = await axios.get(`${BASE}/${campaignId}/insights`, {
        params: {
          access_token: this.accessToken,
          fields: "spend,impressions,clicks,reach,ctr,cpc,cpm,frequency,actions,action_values,cost_per_action_type",
          date_preset: datePreset,
        },
      });
      return res.data.data?.[0] || null;
    } catch { return null; }
  }

  async getAccountInsights(accountId: string, datePreset: string = "last_30d"): Promise<any> {
    try {
      const res = await axios.get(`${BASE}/${accountId}/insights`, {
        params: {
          access_token: this.accessToken,
          fields: "spend,impressions,clicks,reach,ctr,cpc,cpm,frequency,actions,action_values",
          date_preset: datePreset,
          level: "account",
        },
      });
      return res.data.data?.[0] || null;
    } catch { return null; }
  }
}

export function createMetaAdsService(accessToken?: string): MetaAdsService {
  return new MetaAdsService(accessToken || process.env.META_ACCESS_TOKEN || "");
}
export default MetaAdsService;
