import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, DollarSign, Target, RefreshCw, Sparkles, AlertTriangle, Eye, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";

const PLATFORM_COLORS: Record<string, string> = { meta: "#0A66C2", google: "#EA4335", instagram: "#E1306C" };
const PERIOD_OPTIONS = [{ label: "7d", value: 7 }, { label: "30d", value: 30 }, { label: "90d", value: 90 }];

function fmt(n: number) { return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtN(n: number) { return n.toLocaleString('pt-BR'); }

export default function Dashboard() {
  const { isAuthenticated } = useAuth();
  const [period, setPeriod] = useState(30);
  const [, setLocation] = useLocation();

  const { data: stats, isLoading, refetch } = trpc.dashboard.stats.useQuery({ days: period }, { enabled: isAuthenticated, refetchInterval: 5 * 60 * 1000 });
  const { data: alerts } = trpc.budgetAlerts.check.useQuery(undefined, { enabled: isAuthenticated });

  const platformData = stats ? Object.entries(stats.byPlatform).map(([name, d]: [string, any]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: Math.round((d.spent / (stats.totalSpent || 1)) * 100),
    color: PLATFORM_COLORS[name] || "#888",
  })) : [];

  const topClients = (stats?.clientStats || []).slice(0, 5);

  return (
    <DashboardLayout>
      {alerts && alerts.length > 0 && (
        <div className="mb-5 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-start gap-3">
          <AlertTriangle className="text-yellow-400 shrink-0 mt-0.5" size={16} />
          <div className="text-sm">
            <p className="text-yellow-300 font-medium">{alerts.length} alerta(s) de orçamento disparado(s)</p>
            {alerts.map((a: any) => <p key={a.alert.id} className="text-yellow-400/70 text-xs mt-0.5">{a.campaign.name}: {a.spentPct.toFixed(1)}% consumido</p>)}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-slate-400 text-sm">Visão geral de todas as campanhas</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            {PERIOD_OPTIONS.map(o => (
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

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Investido", value: `R$ ${fmt(stats?.totalSpent || 0)}`, icon: DollarSign, color: "text-pink-500", hint: `Últimos ${period} dias` },
          { label: "Impressões", value: fmtN(stats?.totalImpressions || 0), icon: Eye, color: "text-cyan-500", hint: `Alcance: ${fmtN(stats?.totalReach || 0)}` },
          { label: "Cliques", value: fmtN(stats?.totalClicks || 0), icon: TrendingUp, color: "text-pink-500", hint: `CTR: ${(stats?.avgCtr || 0).toFixed(2)}%` },
          { label: "Conversões", value: fmtN(stats?.totalConversions || 0), icon: Target, color: "text-cyan-500", hint: `ROAS: ${(stats?.avgRoas || 0).toFixed(2)}x` },
        ].map(({ label, value, icon: Icon, color, hint }) => (
          <Card key={label} className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={color} size={15} />
                <span className="text-slate-400 text-xs">{label}</span>
              </div>
              {isLoading ? <div className="h-7 w-20 bg-slate-700 rounded animate-pulse" /> : <div className="text-xl font-bold text-white">{value}</div>}
              <p className="text-slate-500 text-xs mt-1">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Top Clientes */}
        <Card className="lg:col-span-2 bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-base">Top Clientes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/clients")} className="text-slate-400 hover:text-white text-xs">
                Ver todos <ArrowRight size={12} className="ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-slate-700 rounded animate-pulse" />)}</div>
            ) : topClients.length > 0 ? (
              <div className="space-y-2">
                {topClients.map((cs: any) => {
                  const budgetPct = cs.client.monthlyBudget ? (cs.spent / parseFloat(cs.client.monthlyBudget)) * 100 : 0;
                  return (
                    <div key={cs.client.id} onClick={() => setLocation(`/clients/${cs.client.id}`)}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 cursor-pointer transition-all group">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {cs.client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{cs.client.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex-1 h-1 bg-slate-600 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${budgetPct > 90 ? "bg-red-500" : budgetPct > 70 ? "bg-yellow-500" : "bg-green-500"}`}
                              style={{ width: `${Math.min(budgetPct, 100)}%` }} />
                          </div>
                          <span className="text-slate-500 text-xs">{budgetPct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white text-sm font-medium">R$ {fmt(cs.spent)}</p>
                        <p className="text-slate-500 text-xs">{cs.activeCampaigns} ativas</p>
                      </div>
                      <ArrowRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Sparkles className="text-slate-600" size={32} />
                <p className="text-slate-400 text-sm">Nenhum cliente ainda</p>
                <Button onClick={() => setLocation("/settings")} size="sm" className="bg-pink-600 hover:bg-pink-700 text-white">
                  Conectar Meta Ads
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribuição por Plataforma */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base">Por Plataforma</CardTitle>
          </CardHeader>
          <CardContent>
            {platformData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={platformData} cx="50%" cy="50%" outerRadius={65} dataKey="value">
                      {platformData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {platformData.map(p => (
                    <div key={p.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                        <span className="text-slate-300">{p.name}</span>
                      </div>
                      <span className="text-slate-400">{p.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <p className="text-slate-500 text-sm text-center py-10">Sem dados</p>}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
