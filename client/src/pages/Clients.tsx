import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Search, ArrowRight, TrendingUp, DollarSign, Target, Users } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";

function fmt(n: number) { return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function Clients() {
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState(30);
  const [, setLocation] = useLocation();

  const { data: clientStats, isLoading, refetch } = trpc.clients.stats.useQuery({ days: period }, { enabled: isAuthenticated });

  const filtered = (clientStats || []).filter((cs: any) =>
    cs.client.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Clientes</h2>
          <p className="text-slate-400 text-sm">{filtered.length} cliente(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            {[{ label: "7d", value: 7 }, { label: "30d", value: 30 }, { label: "90d", value: 90 }].map(o => (
              <button key={o.value} onClick={() => setPeriod(o.value)}
                className={`px-3 py-1.5 text-sm transition-all ${period === o.value ? "bg-pink-600 text-white" : "text-slate-400 hover:text-white"}`}>
                {o.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="border-slate-700 text-slate-300 hover:bg-slate-700">
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
        <Input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
      </div>

      {isLoading ? (
        <div className="grid gap-3">{[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-800 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-3">
          {filtered.map((cs: any) => {
            const budgetPct = cs.client.monthlyBudget ? (cs.spent / parseFloat(cs.client.monthlyBudget)) * 100 : 0;
            const ctr = cs.clicks > 0 && cs.impressions > 0 ? (cs.clicks / cs.impressions * 100) : 0;
            return (
              <Card key={cs.client.id} onClick={() => setLocation(`/clients/${cs.client.id}`)}
                className="bg-slate-800 border-slate-700 hover:border-pink-500/40 cursor-pointer transition-all group">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4 flex-wrap">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                      {cs.client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-white font-medium">{cs.client.name}</h3>
                        {cs.client.paymentMethod && (
                          <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{cs.client.paymentMethod}</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${cs.activeCampaigns > 0 ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-slate-400"}`}>
                          {cs.activeCampaigns} ativa(s)
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-2">
                        <div><span className="text-slate-500">Investido</span><p className="text-white font-medium mt-0.5">R$ {fmt(cs.spent)}</p></div>
                        <div><span className="text-slate-500">Impressões</span><p className="text-white font-medium mt-0.5">{cs.impressions.toLocaleString('pt-BR')}</p></div>
                        <div><span className="text-slate-500">Cliques</span><p className="text-white font-medium mt-0.5">{cs.clicks.toLocaleString('pt-BR')}</p></div>
                        <div><span className="text-slate-500">Conversões</span><p className="text-white font-medium mt-0.5">{cs.conversions}</p></div>
                      </div>
                      {cs.client.monthlyBudget && (
                        <div>
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Verba: R$ {fmt(parseFloat(cs.client.monthlyBudget))}</span>
                            <span className={budgetPct > 90 ? "text-red-400" : budgetPct > 70 ? "text-yellow-400" : "text-green-400"}>
                              {budgetPct.toFixed(1)}% usado
                            </span>
                          </div>
                          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${budgetPct > 90 ? "bg-red-500" : budgetPct > 70 ? "bg-yellow-500" : "bg-green-500"}`}
                              style={{ width: `${Math.min(budgetPct, 100)}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                    <ArrowRight size={18} className="text-slate-600 group-hover:text-pink-400 transition-colors shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Users className="text-slate-600" size={40} />
            <p className="text-slate-300 font-medium">Nenhum cliente encontrado</p>
            <p className="text-slate-500 text-sm">Sincronize sua estrutura Meta em Configurações</p>
            <Button onClick={() => setLocation("/settings")} className="bg-pink-600 hover:bg-pink-700 text-white">
              Ir para Configurações
            </Button>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
