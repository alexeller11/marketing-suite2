import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function AIPlanner() {
  const { isAuthenticated } = useAuth();
  const [campaignName, setCampaignName] = useState("");
  const [platform, setPlatform] = useState("meta");
  const [metrics, setMetrics] = useState({
    spent: 1000,
    impressions: 50000,
    clicks: 2500,
    conversions: 125,
    ctr: 5,
    cpc: 0.4,
    roi: 250,
  });
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const analyzeCampaign = trpc.ai.analyzeCampaign.useMutation({
    onSuccess: (data) => {
      setAnalysis(data);
      toast.success("Análise concluída com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao analisar campanha: ${error.message}`);
    },
  });

  const handleAnalyze = async () => {
    if (!campaignName) {
      toast.error("Por favor, forneça o nome da campanha");
      return;
    }

    setLoading(true);
    try {
      await analyzeCampaign.mutateAsync({
        campaignName,
        platform,
        metrics,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMetricChange = (key: string, value: string) => {
    setMetrics({
      ...metrics,
      [key]: parseFloat(value) || 0,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <p className="text-slate-300">Você precisa estar autenticado para acessar esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles size={32} />
            Planejador de IA
          </h1>
          <p className="text-slate-400 text-sm mt-1">Análise inteligente de campanhas com Groq</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Panel */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800 border-slate-700 sticky top-24">
              <CardHeader>
                <CardTitle className="text-white">Dados da Campanha</CardTitle>
                <CardDescription className="text-slate-400">Forneça os dados para análise</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="campaign-name" className="text-slate-300">
                    Nome da Campanha
                  </Label>
                  <Input
                    id="campaign-name"
                    placeholder="Ex: Campanha Verão 2024"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="platform" className="text-slate-300">
                    Plataforma
                  </Label>
                  <select
                    id="platform"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2 mt-2"
                  >
                    <option value="meta">Meta Ads</option>
                    <option value="google">Google Ads</option>
                    <option value="instagram">Instagram Ads</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="spent" className="text-slate-300">
                      Orçamento Gasto (R$)
                    </Label>
                    <Input
                      id="spent"
                      type="number"
                      value={metrics.spent}
                      onChange={(e) => handleMetricChange("spent", e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="impressions" className="text-slate-300">
                      Impressões
                    </Label>
                    <Input
                      id="impressions"
                      type="number"
                      value={metrics.impressions}
                      onChange={(e) => handleMetricChange("impressions", e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="clicks" className="text-slate-300">
                      Cliques
                    </Label>
                    <Input
                      id="clicks"
                      type="number"
                      value={metrics.clicks}
                      onChange={(e) => handleMetricChange("clicks", e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="conversions" className="text-slate-300">
                      Conversões
                    </Label>
                    <Input
                      id="conversions"
                      type="number"
                      value={metrics.conversions}
                      onChange={(e) => handleMetricChange("conversions", e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="ctr" className="text-slate-300">
                      CTR (%)
                    </Label>
                    <Input
                      id="ctr"
                      type="number"
                      step="0.01"
                      value={metrics.ctr}
                      onChange={(e) => handleMetricChange("ctr", e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cpc" className="text-slate-300">
                      CPC (R$)
                    </Label>
                    <Input
                      id="cpc"
                      type="number"
                      step="0.01"
                      value={metrics.cpc}
                      onChange={(e) => handleMetricChange("cpc", e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="roi" className="text-slate-300">
                      ROI (%)
                    </Label>
                    <Input
                      id="roi"
                      type="number"
                      step="0.01"
                      value={metrics.roi}
                      onChange={(e) => handleMetricChange("roi", e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleAnalyze}
                  disabled={loading || !campaignName}
                  className="w-full bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-700 hover:to-cyan-700 text-white"
                >
                  {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : <Sparkles className="mr-2" size={20} />}
                  Analisar com IA
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2">
            {analysis ? (
              <div className="space-y-6">
                {/* Sentiment Badge */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 font-semibold">Sentimento da Análise:</span>
                      <span
                        className={`px-4 py-2 rounded-full font-semibold ${
                          analysis.sentiment === "positive"
                            ? "bg-green-500/20 text-green-400"
                            : analysis.sentiment === "negative"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {analysis.sentiment === "positive"
                          ? "Positivo ✓"
                          : analysis.sentiment === "negative"
                          ? "Negativo ✗"
                          : "Neutro"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Analysis */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Análise Detalhada</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-invert max-w-none">
                      <Streamdown>{analysis.analysis}</Streamdown>
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                {analysis.recommendations && analysis.recommendations.length > 0 && (
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white">Recomendações</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {analysis.recommendations.map((rec: string, idx: number) => (
                          <li key={idx} className="flex gap-3 text-slate-300">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-sm font-semibold">
                              {idx + 1}
                            </span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="bg-slate-800 border-slate-700 h-96 flex items-center justify-center">
                <CardContent className="text-center">
                  <AlertCircle className="mx-auto mb-4 text-slate-500" size={48} />
                  <p className="text-slate-400">Preencha os dados da campanha e clique em "Analisar com IA"</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
