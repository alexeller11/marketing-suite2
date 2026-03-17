import axios from "axios";

const GROQ_API_BASE_URL = "https://api.groq.com/openai/v1";

export interface GroqAnalysisRequest {
  campaignName: string;
  metrics: {
    spent: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpc: number;
    roi: number;
  };
  platform: string;
}

export interface GroqAnalysisResponse {
  analysis: string;
  recommendations: string[];
  sentiment: "positive" | "neutral" | "negative";
}

class GroqService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Analisar campanha com Groq
   */
  async analyzeCampaign(request: GroqAnalysisRequest): Promise<GroqAnalysisResponse> {
    try {
      const prompt = this.buildAnalysisPrompt(request);

      const response = await axios.post(
        `${GROQ_API_BASE_URL}/chat/completions`,
        {
          model: "mixtral-8x7b-32768",
          messages: [
            {
              role: "system",
              content:
                "Você é um especialista em marketing digital e análise de campanhas. Forneça análises detalhadas e recomendações práticas.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1024,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const content = response.data.choices[0]?.message?.content || "";
      return this.parseAnalysisResponse(content);
    } catch (error) {
      console.error("[Groq] Error analyzing campaign:", error);
      throw error;
    }
  }

  /**
   * Gerar recomendações de otimização
   */
  async generateOptimizationRecommendations(
    campaignName: string,
    metrics: any
  ): Promise<string[]> {
    try {
      const prompt = `
        Analise a seguinte campanha de marketing e forneça 5 recomendações específicas de otimização:
        
        Campanha: ${campaignName}
        Orçamento gasto: R$ ${metrics.spent}
        Impressões: ${metrics.impressions}
        Cliques: ${metrics.clicks}
        Conversões: ${metrics.conversions}
        CTR: ${metrics.ctr}%
        CPC: R$ ${metrics.cpc}
        ROI: ${metrics.roi}%
        
        Forneça recomendações em formato de lista numerada.
      `;

      const response = await axios.post(
        `${GROQ_API_BASE_URL}/chat/completions`,
        {
          model: "mixtral-8x7b-32768",
          messages: [
            {
              role: "system",
              content:
                "Você é um especialista em otimização de campanhas de marketing digital. Forneça recomendações práticas e acionáveis.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1024,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const content = response.data.choices[0]?.message?.content || "";
      return this.parseRecommendations(content);
    } catch (error) {
      console.error("[Groq] Error generating recommendations:", error);
      throw error;
    }
  }

  /**
   * Construir prompt de análise
   */
  private buildAnalysisPrompt(request: GroqAnalysisRequest): string {
    return `
      Analise a seguinte campanha de ${request.platform} e forneça insights detalhados:
      
      Nome da Campanha: ${request.campaignName}
      Orçamento gasto: R$ ${request.metrics.spent}
      Impressões: ${request.metrics.impressions}
      Cliques: ${request.metrics.clicks}
      Conversões: ${request.metrics.conversions}
      Taxa de Clique (CTR): ${request.metrics.ctr}%
      Custo por Clique (CPC): R$ ${request.metrics.cpc}
      Retorno sobre Investimento (ROI): ${request.metrics.roi}%
      
      Por favor, forneça:
      1. Uma análise geral do desempenho
      2. Pontos fortes e fracos
      3. Recomendações de otimização
      4. Próximos passos sugeridos
    `;
  }

  /**
   * Analisar resposta de análise
   */
  private parseAnalysisResponse(content: string): GroqAnalysisResponse {
    // Extrair sentimento da análise
    const sentiment = this.extractSentiment(content);

    // Extrair recomendações
    const recommendations = this.parseRecommendations(content);

    return {
      analysis: content,
      recommendations,
      sentiment,
    };
  }

  /**
   * Extrair recomendações do texto
   */
  private parseRecommendations(content: string): string[] {
    const lines = content.split("\n");
    const recommendations: string[] = [];

    for (const line of lines) {
      // Procurar por linhas numeradas ou com bullet points
      if (/^\d+\.|^[-•*]/.test(line.trim())) {
        const cleaned = line.replace(/^\d+\.|^[-•*]/, "").trim();
        if (cleaned.length > 0) {
          recommendations.push(cleaned);
        }
      }
    }

    return recommendations.slice(0, 5); // Limitar a 5 recomendações
  }

  /**
   * Extrair sentimento da análise
   */
  private extractSentiment(
    content: string
  ): "positive" | "neutral" | "negative" {
    const lowerContent = content.toLowerCase();

    const positiveKeywords = [
      "excelente",
      "ótimo",
      "bom",
      "sucesso",
      "melhor",
      "crescimento",
      "positivo",
    ];
    const negativeKeywords = [
      "fraco",
      "ruim",
      "problema",
      "falha",
      "pior",
      "queda",
      "negativo",
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    for (const keyword of positiveKeywords) {
      if (lowerContent.includes(keyword)) positiveCount++;
    }

    for (const keyword of negativeKeywords) {
      if (lowerContent.includes(keyword)) negativeCount++;
    }

    if (positiveCount > negativeCount) return "positive";
    if (negativeCount > positiveCount) return "negative";
    return "neutral";
  }
}

export function createGroqService(): GroqService {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured");
  }
  return new GroqService(apiKey);
}

export default GroqService;
