import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, AlertCircle, History, ChevronDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";

export default function AIPlanner() {
  const { isAuthenticated } = useAuth();
  const [campaignName, setCampaignName] = useState("");
  const [platform, setPlatform] = useState("meta");
  const [metrics, setMetrics] = useState({ spent: 1000, impressions: 50000, clicks: 2500, conversions: 125, ctr: 5, cpc: 0.4, roi: 250 });
  const [analysis, setAnalysis] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);

  const { data: campaigns } = trpc.campaigns.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: aiHistory } = trpc.ai.history.useQuery({ limit: 5 }, { enabled: isAuthenticated && showHistory });

  const analyzeMutation = trpc.ai.analyzeCampaign.useMutation({
    onSuccess: (data) => { setAnalysis(data); toast.success("Análise concluída!"); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const loadFromCampaign = (campaign: any) => {
    setCampaignName(campaign.name);
    setPlatform(campaign.platform);
    setMetrics({
      spent: parseFloat(campaign.spent?.toString() || "0"),
      impressions: campaign.impressions || 0,
      clicks: campaign.clicks || 0,
      conversions: campaign.conversions || 0,
      ctr: parseFloat(campaign.ctr?.toString() || "0"),
      cpc: parseFloat(campaign.cpc?.toString() || "0"),
      roi: parseFloat(campaign.roi?.toString() || "0"),
    });
    toast.success(`Dados de "${campaign.name}" carregados`);
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Sparkles size={22} className="text-pink-400" />Planejador IA</h2>
        <p className="text-slate-400 text-sm mt-0.5">Análise inteligente com Llama 3.3 via Groq</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          {campaigns && campaigns.length > 0 && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3"><CardTitle className="text-white text-sm">Carregar campanha existente</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {campaigns.slice(0, 5).map(c => (
                  <button key={c.id} onClick={() => loadFromCampaign(c)}
                    className="w-full text-left p-2.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 transition-all">
                    <p className="text-white text-sm font-medium truncate">{c.name}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{c.platform} · CTR {parseFloat(c.ctr?.toString() || "0").toFixed(2)}%</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
          <Card className="bg-slate-800 border-slate-700 sticky top-6">
            <CardHeader><CardTitle className="text-white text-sm">Dados da Campanha</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label className="text-slate-300 text-xs">Nome</Label><Input placeholder="Campanha Verão 2025" value={campaignName} onChange={e => setCampaignName(e.target.value)} className="bg-slate-700 border-slate-600 text-white mt-1 text-sm" /></div>
              <div>
                <Label className="text-slate-300 text-xs">Plataforma</Label>
                <select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2 mt-1 text-sm">
                  <option value="meta">Meta Ads</option>
                  <option value="google">Google Ads</option>
                  <option value="instagram">Instagram Ads</option>
                </select>
              </div>
              {[
                { key: "spent", label: "Orçamento Gasto (R$)", step: "1" },
                { key: "impressions", label: "Impressões", step: "100" },
                { key: "clicks", label: "Cliques", step: "10" },
                { key: "conversions", label: "Conversões", step: "1" },
                { key: "ctr", label: "CTR (%)", step: "0.01" },
                { key: "cpc", label: "CPC (R$)", step: "0.01" },
                { key: "roi", label: "ROI (%)", step: "1" },
              ].map(({ key, label, step }) => (
                <div key={key}>
                  <Label className="text-slate-300 text-xs">{label}</Label>
                  <Input type="number" step={step} value={(metrics as any)[key]} onChange={e => setMetrics(m => ({ ...m, [key]: parseFloat(e.target.value) || 0 }))} className="bg-slate-700 border-slate-600 text-white mt-1 text-sm" />
                </div>
              ))}
              <Button onClick={() => { if (!campaignName) { toast.error("Informe o nome da campanha"); return; } analyzeMutation.mutate({ campaignName, platform, metrics }); }}
                disabled={analyzeMutation.isPending || !campaignName} className="w-full bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-700 hover:to-cyan-700 text-white mt-2">
                {analyzeMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : <Sparkles className="mr-2" size={16} />}
                Analisar com IA
              </Button>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2 space-y-4">
          {analysis ? (
            <>
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 text-sm font-medium">Sentimento:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${analysis.sentiment === "positive" ? "bg-green-500/20 text-green-400" : analysis.sentiment === "negative" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                      {analysis.sentiment === "positive" ? "✓ Positivo" : analysis.sentiment === "negative" ? "✗ Negativo" : "◐ Neutro"}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader><CardTitle className="text-white text-base">Análise Detalhada</CardTitle></CardHeader>
                <CardContent><div className="prose prose-invert prose-sm max-w-none"><Streamdown>{analysis.analysis}</Streamdown></div></CardContent>
              </Card>
              {analysis.recommendations?.length > 0 && (
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader><CardTitle className="text-white text-base">Recomendações</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-2.5">
                      {analysis.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="flex gap-3 text-slate-300 text-sm">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-xs font-medium">{i+1}</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="bg-slate-800 border-slate-700 h-64 flex items-center justify-center">
              <CardContent className="text-center">
                <AlertCircle className="mx-auto mb-3 text-slate-600" size={36} />
                <p className="text-slate-400 text-sm">Preencha os dados e clique em "Analisar com IA"</p>
                <p className="text-slate-500 text-xs mt-1">Ou carregue uma campanha existente acima</p>
              </CardContent>
            </Card>
          )}
          <button onClick={() => setShowHistory(v => !v)} className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm transition-colors">
            <History size={14} /><span>Histórico de análises</span><ChevronDown size={14} className={`transition-transform ${showHistory ? "rotate-180" : ""}`} />
          </button>
          {showHistory && aiHistory && aiHistory.length > 0 && (
            <div className="space-y-2">
              {aiHistory.map((h: any) => (
                <Card key={h.id} className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-3">
                    <p className="text-white text-sm font-medium">{h.prompt}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{new Date(h.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
