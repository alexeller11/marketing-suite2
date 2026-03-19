import axios from "axios";

const GROQ_API_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_MODEL = "llama-3.3-70b-versatile";

export interface CampaignMetrics {
  spent: number; impressions: number; clicks: number; conversions: number;
  reach: number; ctr: number; cpc: number; cpm: number; roas: number;
  frequency: number; costPerResult: number;
}

export interface GroqAnalysisResponse {
  analysis: string;
  recommendations: string[];
  optimizations: string[];
  alerts: string[];
  score: number;
  sentiment: "positive" | "neutral" | "negative";
}

class GroqService {
  constructor(private apiKey: string) {}

  private async callGroq(systemPrompt: string, userPrompt: string, maxTokens = 3000): Promise<string> {
    const res = await axios.post(`${GROQ_API_BASE_URL}/chat/completions`, {
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: maxTokens,
    }, { headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" } });
    return res.data.choices[0]?.message?.content || "";
  }

  async analyzeClientFull(clientData: {
    clientName: string;
    platform: string;
    period: string;
    totalSpent: number;
    monthlyBudget: number;
    campaigns: Array<{ name: string; status: string; metrics: CampaignMetrics }>;
  }): Promise<GroqAnalysisResponse> {
    const budgetUsage = clientData.monthlyBudget > 0
      ? ((clientData.totalSpent / clientData.monthlyBudget) * 100).toFixed(1)
      : "N/A";

    const campaignsSummary = clientData.campaigns.map(c => `
      - ${c.name} (${c.status})
        Gasto: R$${c.metrics.spent.toFixed(2)} | Impressões: ${c.metrics.impressions.toLocaleString('pt-BR')}
        Cliques: ${c.metrics.clicks.toLocaleString('pt-BR')} | CTR: ${c.metrics.ctr.toFixed(2)}%
        CPC: R$${c.metrics.cpc.toFixed(2)} | CPM: R$${c.metrics.cpm.toFixed(2)}
        Conversões: ${c.metrics.conversions} | ROAS: ${c.metrics.roas.toFixed(2)}x
        Frequência: ${c.metrics.frequency.toFixed(2)} | Alcance: ${c.metrics.reach.toLocaleString('pt-BR')}
    `).join("\n");

    const prompt = `
Analise o desempenho do cliente "${clientData.clientName}" no ${clientData.platform} no período: ${clientData.period}.

RESUMO GERAL:
- Verba total investida: R$${clientData.totalSpent.toFixed(2)}
- Orçamento mensal: R$${clientData.monthlyBudget.toFixed(2)}
- Uso do orçamento: ${budgetUsage}%
- Total de campanhas: ${clientData.campaigns.length}
- Campanhas ativas: ${clientData.campaigns.filter(c => c.status === "active").length}

CAMPANHAS:
${campaignsSummary}

Forneça uma análise COMPLETA e PROFISSIONAL em português com:

1. **DIAGNÓSTICO GERAL** (2-3 parágrafos)
   - Avalie o desempenho geral
   - Compare com benchmarks do mercado brasileiro
   - Identifique tendências

2. **PONTOS FORTES** (liste os destaques positivos)

3. **PONTOS DE ATENÇÃO** (problemas identificados)

4. **OTIMIZAÇÕES PRIORITÁRIAS** (5-7 ações específicas e práticas, numeradas)
   - Seja específico sobre O QUÊ fazer, COMO fazer e POR QUÊ

5. **SUGESTÕES ESTRATÉGICAS** (3-5 sugestões de médio/longo prazo)

6. **ALERTAS** (situações urgentes que precisam de atenção imediata)

7. **SCORE DE SAÚDE** (0-100): Avalie o estado geral das campanhas
   Formato: SCORE: [número]

Use benchmarks reais do mercado: CTR médio Meta = 1-2%, CPC médio = R$0,50-2,00, Frequência ideal = 1,5-3,0.
    `;

    const systemPrompt = `Você é um especialista sênior em marketing digital com 10+ anos de experiência em Meta Ads e Google Ads no mercado brasileiro. 
Trabalha com agências e gerencia budgets de R$50k a R$500k/mês. 
Suas análises são precisas, práticas e orientadas a resultados.
Use dados reais e benchmarks do mercado brasileiro.
Seja direto e específico — o gestor precisa saber exatamente o que fazer.`;

    const content = await this.callGroq(systemPrompt, prompt, 4000);
    return this.parseFullAnalysis(content);
  }

  async analyzeCampaign(request: {
    campaignName: string;
    platform: string;
    metrics: CampaignMetrics;
    campaignId?: number;
  }): Promise<GroqAnalysisResponse> {
    const prompt = `
Analise a campanha "${request.campaignName}" no ${request.platform}:

Métricas (últimos 30 dias):
- Gasto: R$${request.metrics.spent.toFixed(2)}
- Impressões: ${request.metrics.impressions.toLocaleString('pt-BR')}
- Alcance: ${request.metrics.reach.toLocaleString('pt-BR')}
- Cliques: ${request.metrics.clicks.toLocaleString('pt-BR')}
- CTR: ${request.metrics.ctr.toFixed(2)}%
- CPC: R$${request.metrics.cpc.toFixed(2)}
- CPM: R$${request.metrics.cpm.toFixed(2)}
- Conversões: ${request.metrics.conversions}
- ROAS: ${request.metrics.roas.toFixed(2)}x
- Frequência: ${request.metrics.frequency.toFixed(2)}
- Custo por Resultado: R$${request.metrics.costPerResult.toFixed(2)}

Forneça análise completa com diagnóstico, pontos fortes, alertas, 5 otimizações práticas numeradas e SCORE: [0-100].
    `;

    const content = await this.callGroq(
      "Especialista sênior em Meta Ads e Google Ads. Análises precisas e práticas para o mercado brasileiro.",
      prompt,
      2000
    );
    return this.parseFullAnalysis(content);
  }

  async generateOptimizationRecommendations(campaignName: string, metrics: any): Promise<string[]> {
    const prompt = `5 recomendações específicas para "${campaignName}": CTR:${metrics.ctr}% CPC:R$${metrics.cpc} ROAS:${metrics.roas}x Conv:${metrics.conversions}. Lista numerada apenas.`;
    const content = await this.callGroq("Especialista Meta Ads Brasil.", prompt, 600);
    return this.parseRecommendations(content);
  }

  private parseFullAnalysis(content: string): GroqAnalysisResponse {
    const scoreMatch = content.match(/SCORE:\s*(\d+)/i);
    const score = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1]))) : 50;
    const recommendations = this.parseRecommendations(content);
    const optimizations = this.parseSection(content, "OTIMIZAÇÕES");
    const alerts = this.parseAlerts(content);
    const sentiment = score >= 70 ? "positive" : score >= 40 ? "neutral" : "negative";
    return { analysis: content, recommendations, optimizations, alerts, score, sentiment };
  }

  private parseRecommendations(content: string): string[] {
    const lines = content.split("\n");
    const recs: string[] = [];
    for (const line of lines) {
      if (/^\d+[\.\)]\s/.test(line.trim())) {
        const cleaned = line.replace(/^\d+[\.\)]\s*/, "").replace(/\*\*/g, "").trim();
        if (cleaned.length > 15) recs.push(cleaned);
      }
    }
    return recs.slice(0, 7);
  }

  private parseSection(content: string, sectionName: string): string[] {
    const lines = content.split("\n");
    const items: string[] = [];
    let inSection = false;
    for (const line of lines) {
      if (line.toUpperCase().includes(sectionName)) { inSection = true; continue; }
      if (inSection && line.match(/^#{1,3}\s|\*\*[A-Z]/)) { inSection = false; }
      if (inSection && line.trim().length > 15) {
        const cleaned = line.replace(/^[-•*\d\.]\s*/, "").replace(/\*\*/g, "").trim();
        if (cleaned) items.push(cleaned);
      }
    }
    return items.slice(0, 7);
  }

  private parseAlerts(content: string): string[] {
    const alertKeywords = ["urgente", "atenção", "crítico", "problema", "alerta", "preocupante", "queda", "alto demais"];
    const lines = content.split("\n");
    const alerts: string[] = [];
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (alertKeywords.some(k => lower.includes(k)) && line.trim().length > 20) {
        alerts.push(line.replace(/^[-•*\d\.#*\s]+/, "").trim());
      }
    }
    return alerts.slice(0, 5);
  }

  private extractSentiment(content: string): "positive" | "neutral" | "negative" {
    const lower = content.toLowerCase();
    const pos = ["excelente","ótimo","bom","sucesso","crescimento","positivo","acima","supera","eficiente"].filter(k => lower.includes(k)).length;
    const neg = ["fraco","ruim","problema","falha","queda","negativo","abaixo","preocupante","ineficiente","urgente"].filter(k => lower.includes(k)).length;
    if (pos > neg) return "positive";
    if (neg > pos) return "negative";
    return "neutral";
  }
}

export function createGroqService(): GroqService {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY não configurada");
  return new GroqService(apiKey);
}

export default GroqService;
