import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  paused: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  completed: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  draft: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};
const STATUS_LABELS: Record<string, string> = { active: "Ativa", paused: "Pausada", completed: "Concluída", draft: "Rascunho" };
const PLATFORM_LABELS: Record<string, string> = { meta: "Meta Ads", google: "Google Ads", instagram: "Instagram" };

export default function Campaigns() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [analyzing, setAnalyzing] = useState<number | null>(null);

  const { data: campaigns, isLoading, refetch } = trpc.campaigns.list.useQuery(undefined, { enabled: isAuthenticated });
  const analyzeMutation = trpc.ai.analyzeCampaign.useMutation({
    onSuccess: () => { toast.success("Análise concluída!"); setLocation("/ai-planner"); },
    onError: (e) => { toast.error(`Erro: ${e.message}`); setAnalyzing(null); },
  });

  const handleAnalyze = async (campaign: any) => {
    setAnalyzing(campaign.id);
    await analyzeMutation.mutateAsync({
      campaignId: campaign.id,
      campaignName: campaign.name,
      platform: campaign.platform,
      metrics: {
        spent: parseFloat(campaign.spent?.toString() || "0"),
        impressions: campaign.impressions || 0,
        clicks: campaign.clicks || 0,
        conversions: campaign.conversions || 0,
        ctr: parseFloat(campaign.ctr?.toString() || "0"),
        cpc: parseFloat(campaign.cpc?.toString() || "0"),
        roi: parseFloat(campaign.roi?.toString() || "0"),
      },
    });
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Campanhas</h2>
          <p className="text-slate-400 text-sm mt-0.5">{campaigns?.length || 0} campanha(s)</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="border-slate-700 text-slate-300 hover:bg-slate-700">
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
        </Button>
      </div>
      {isLoading ? (
        <div className="grid gap-3">{[1,2,3].map(i => <div key={i} className="h-28 bg-slate-800 rounded-xl animate-pulse" />)}</div>
      ) : campaigns && campaigns.length > 0 ? (
        <div className="grid gap-3">
          {campaigns.map(campaign => {
            const spent = parseFloat(campaign.spent?.toString() || "0");
            const budget = parseFloat(campaign.budget?.toString() || "0");
            const spentPct = budget > 0 ? (spent / budget) * 100 : 0;
            const ctr = parseFloat(campaign.ctr?.toString() || "0");
            const ctrIcon = ctr > 3 ? <TrendingUp size={13} className="text-green-400" /> : ctr > 1 ? <Minus size={13} className="text-yellow-400" /> : <TrendingDown size={13} className="text-red-400" />;
            return (
              <Card key={campaign.id} className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="text-white font-medium truncate">{campaign.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[campaign.status] || STATUS_COLORS.draft}`}>
                          {STATUS_LABELS[campaign.status] || campaign.status}
                        </span>
                        <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded-full">
                          {PLATFORM_LABELS[campaign.platform] || campaign.platform}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-xs">
                        <div><span className="text-slate-500">Gasto</span><p className="text-white font-medium mt-0.5">R$ {spent.toFixed(2)}</p></div>
                        <div><span className="text-slate-500">Impressões</span><p className="text-white font-medium mt-0.5">{(campaign.impressions || 0).toLocaleString('pt-BR')}</p></div>
                        <div><span className="text-slate-500">Cliques</span><p className="text-white font-medium mt-0.5">{(campaign.clicks || 0).toLocaleString('pt-BR')}</p></div>
                        <div><span className="text-slate-500">Conversões</span><p className="text-white font-medium mt-0.5">{campaign.conversions || 0}</p></div>
                        <div><span className="text-slate-500">CTR</span><p className="text-white font-medium mt-0.5 flex items-center gap-1">{ctrIcon}{ctr.toFixed(2)}%</p></div>
                        <div><span className="text-slate-500">CPC</span><p className="text-white font-medium mt-0.5">R$ {parseFloat(campaign.cpc?.toString() || "0").toFixed(2)}</p></div>
                      </div>
                      {budget > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Orçamento usado</span><span>{spentPct.toFixed(1)}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${spentPct > 90 ? "bg-red-500" : spentPct > 70 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${Math.min(spentPct, 100)}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                    <Button size="sm" onClick={() => handleAnalyze(campaign)} disabled={analyzing === campaign.id}
                      className="bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-700 hover:to-cyan-700 text-white shrink-0">
                      {analyzing === campaign.id ? <RefreshCw size={13} className="animate-spin mr-1.5" /> : <Sparkles size={13} className="mr-1.5" />}
                      Analisar IA
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-slate-300 font-medium">Nenhuma campanha encontrada</p>
            <p className="text-slate-500 text-sm">Sincronize suas campanhas em Configurações</p>
            <Button onClick={() => setLocation("/settings")} className="bg-pink-600 hover:bg-pink-700 text-white">Ir para Configurações</Button>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
