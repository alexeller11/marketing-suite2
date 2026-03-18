import axios from "axios";

const GROQ_API_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_MODEL = "llama-3.3-70b-versatile";

export interface GroqAnalysisRequest {
  campaignName: string;
  metrics: { spent: number; impressions: number; clicks: number; conversions: number; ctr: number; cpc: number; roi: number; };
  platform: string;
}

export interface GroqAnalysisResponse {
  analysis: string;
  recommendations: string[];
  sentiment: "positive" | "neutral" | "negative";
}

class GroqService {
  constructor(private apiKey: string) {}

  async analyzeCampaign(request: GroqAnalysisRequest): Promise<GroqAnalysisResponse> {
    const prompt = `Analise a campanha de ${request.platform} abaixo e forneça insights em português:

Campanha: ${request.campaignName}
Orçamento gasto: R$ ${request.metrics.spent.toFixed(2)}
Impressões: ${request.metrics.impressions.toLocaleString('pt-BR')}
Cliques: ${request.metrics.clicks.toLocaleString('pt-BR')}
Conversões: ${request.metrics.conversions}
CTR: ${request.metrics.ctr.toFixed(2)}%
CPC: R$ ${request.metrics.cpc.toFixed(2)}
ROI: ${request.metrics.roi.toFixed(2)}%

Forneça:
1. Análise geral de desempenho (2-3 parágrafos)
2. Pontos fortes e fracos
3. Pelo menos 5 recomendações práticas e específicas numeradas
4. Próximos passos prioritários`;

    const response = await axios.post(`${GROQ_API_BASE_URL}/chat/completions`, {
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: "Você é um especialista sênior em marketing digital e performance de campanhas pagas. Seja direto, prático e use benchmarks do mercado brasileiro." },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 2048,
    }, { headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" } });

    const content = response.data.choices[0]?.message?.content || "";
    return this.parseResponse(content);
  }

  async generateOptimizationRecommendations(campaignName: string, metrics: any): Promise<string[]> {
    const prompt = `Forneça 5 recomendações específicas e acionáveis para otimizar a campanha "${campaignName}":
CTR: ${metrics.ctr}% | CPC: R$${metrics.cpc} | ROI: ${metrics.roi}% | Conversões: ${metrics.conversions}
Responda apenas com lista numerada, sem introdução.`;

    const response = await axios.post(`${GROQ_API_BASE_URL}/chat/completions`, {
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: "Especialista em otimização de campanhas digitais. Seja direto e prático." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 800,
    }, { headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" } });

    return this.parseRecommendations(response.data.choices[0]?.message?.content || "");
  }

  private parseResponse(content: string): GroqAnalysisResponse {
    return { analysis: content, recommendations: this.parseRecommendations(content), sentiment: this.extractSentiment(content) };
  }

  private parseRecommendations(content: string): string[] {
    const lines = content.split("\n");
    const recs: string[] = [];
    for (const line of lines) {
      if (/^\d+[\.\ )]\s/.test(line.trim())) {
        const cleaned = line.replace(/^\d+[\.\)]\s*/, "").trim();
        if (cleaned.length > 10) recs.push(cleaned);
      }
    }
    return recs.slice(0, 5);
  }

  private extractSentiment(content: string): "positive" | "neutral" | "negative" {
    const lower = content.toLowerCase();
    const pos = ["excelente","ótimo","bom","sucesso","melhor","crescimento","positivo","acima","supera","eficiente"].filter(k => lower.includes(k)).length;
    const neg = ["fraco","ruim","problema","falha","pior","queda","negativo","abaixo","preocupante","ineficiente"].filter(k => lower.includes(k)).length;
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
