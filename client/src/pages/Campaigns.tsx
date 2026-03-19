import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Sparkles, TrendingUp, TrendingDown, Minus, Search } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";

function fmt(n: number) { return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  paused: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  completed: "bg-slate-500/20 text-slate-400",
  draft: "bg-blue-500/20 text-blue-400",
};
const STATUS_LABELS: Record<string, string> = { active: "Ativa", paused: "Pausada", completed: "Concluída", draft: "Rascunho" };

export default function Campaigns() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [analyzing, setAnalyzing] = useState<number | null>(null);

  const { data: campaigns, isLoading, refetch } = trpc.campaigns.list.useQuery(
    { status: statusFilter !== "all" ? statusFilter : undefined },
    { enabled: isAuthenticated }
  );
  const { data: clients } = trpc.clients.list.useQuery(undefined, { enabled: isAuthenticated });

  const analyzeMutation = trpc.ai.analyzeCampaign.useMutation({
    onSuccess: () => { toast.success("Análise salva!"); setAnalyzing(null); },
    onError: (e) => { toast.error(`Erro: ${e.message}`); setAnalyzing(null); },
  });

  const filtered = (campaigns || []).filter((c: any) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchPlatform = platform === "all" || c.platform === platform;
    return matchSearch && matchPlatform;
  });

  const getClientName = (clientId: number | null) => {
    if (!clientId) return null;
    return (clients || []).find((c: any) => c.id === clientId)?.name;
  };

  const handleAnalyze = (campaign: any) => {
    setAnalyzing(campaign.id);
    analyzeMutation.mutate({
      campaignId: campaign.id,
      clientId: campaign.clientId || undefined,
      campaignName: campaign.name,
      platform: campaign.platform,
      metrics: {
        spent: parseFloat(campaign.spent?.toString() || "0"),
        impressions: campaign.impressions || 0,
        clicks: campaign.clicks || 0,
        conversions: campaign.conversions || 0,
        reach: campaign.reach || 0,
        ctr: parseFloat(campaign.ctr?.toString() || "0"),
        cpc: parseFloat(campaign.cpc?.toString() || "0"),
        cpm: parseFloat(campaign.cpm?.toString() || "0"),
        roas: parseFloat(campaign.roas?.toString() || "0"),
        frequency: parseFloat(campaign.frequency?.toString() || "0"),
        costPerResult: parseFloat(campaign.costPerResult?.toString() || "0"),
      },
    });
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Campanhas</h2>
          <p className="text-slate-400 text-sm">{filtered.length} campanha(s)</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="border-slate-700 text-slate-300 hover:bg-slate-700">
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <Input placeholder="Buscar campanha..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-8 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-8 text-sm" />
        </div>
        <div className="flex bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          {[{ label: "Todas", value: "all" }, { label: "Ativas", value: "active" }, { label: "Pausadas", value: "paused" }].map(o => (
            <button key={o.value} onClick={() => setStatusFilter(o.value)}
              className={`px-3 py-1.5 text-xs transition-all ${statusFilter === o.value ? "bg-pink-600 text-white" : "text-slate-400 hover:text-white"}`}>
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          {[{ label: "Todas", value: "all" }, { label: "Meta", value: "meta" }, { label: "Google", value: "google" }].map(o => (
            <button key={o.value} onClick={() => setPlatform(o.value)}
              className={`px-3 py-1.5 text-xs transition-all ${platform === o.value ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((c: any) => {
            const spent = parseFloat(c.spent?.toString() || "0");
            const budget = parseFloat(c.budget?.toString() || "0");
            const spentPct = budget > 0 ? (spent / budget) * 100 : 0;
            const ctr = parseFloat(c.ctr?.toString() || "0");
            const roas = parseFloat(c.roas?.toString() || "0");
            const ctrIcon = ctr > 2 ? <TrendingUp size={12} className="text-green-400" /> : ctr > 1 ? <Minus size={12} className="text-yellow-400" /> : <TrendingDown size={12} className="text-red-400" />;
            const clientName = getClientName(c.clientId);
            return (
              <Card key={c.id} className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <h3 className="text-white text-sm font-medium truncate">{c.name}</h3>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${STATUS_COLORS[c.status] || ""}`}>
                          {STATUS_LABELS[c.status] || c.status}
                        </span>
                        <span className="text-xs bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded capitalize">{c.platform}</span>
                        {clientName && (
                          <button onClick={() => setLocation(`/clients/${c.clientId}`)}
                            className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline">
                            {clientName}
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
                        <div><span className="text-slate-500">Gasto</span><p className="text-white font-medium">R$ {fmt(spent)}</p></div>
                        <div><span className="text-slate-500">Impressões</span><p className="text-white font-medium">{(c.impressions || 0).toLocaleString('pt-BR')}</p></div>
                        <div><span className="text-slate-500">Cliques</span><p className="text-white font-medium">{(c.clicks || 0).toLocaleString('pt-BR')}</p></div>
                        <div><span className="text-slate-500">CTR</span><p className="text-white font-medium flex items-center gap-0.5">{ctrIcon}{ctr.toFixed(2)}%</p></div>
                        <div><span className="text-slate-500">CPC</span><p className="text-white font-medium">R$ {fmt(parseFloat(c.cpc?.toString() || "0"))}</p></div>
                        <div><span className="text-slate-500">ROAS</span><p className={`font-medium ${roas >= 3 ? "text-green-400" : roas >= 1 ? "text-yellow-400" : "text-red-400"}`}>{roas.toFixed(2)}x</p></div>
                      </div>
                      {budget > 0 && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-slate-500 mb-0.5">
                            <span>Orçamento</span><span>{spentPct.toFixed(1)}%</span>
                          </div>
                          <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${spentPct > 90 ? "bg-red-500" : spentPct > 70 ? "bg-yellow-500" : "bg-green-500"}`}
                              style={{ width: `${Math.min(spentPct, 100)}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                    <Button size="sm" onClick={() => handleAnalyze(c)} disabled={analyzing === c.id}
                      className="bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-700 hover:to-cyan-700 text-white shrink-0 text-xs">
                      {analyzing === c.id ? <RefreshCw size={12} className="animate-spin mr-1" /> : <Sparkles size={12} className="mr-1" />}
                      IA
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-slate-400 text-sm">Nenhuma campanha encontrada</p>
            <Button onClick={() => setLocation("/settings")} size="sm" className="bg-pink-600 hover:bg-pink-700 text-white">
              Sincronizar campanhas
            </Button>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
