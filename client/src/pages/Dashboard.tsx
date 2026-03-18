import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, DollarSign, Target, RefreshCw, Sparkles, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";

const PLATFORM_COLORS: Record<string, string> = { meta: "#0A66C2", google: "#EA4335", instagram: "#E1306C" };
const PERIOD_OPTIONS = [{ label: "7 dias", value: 7 }, { label: "30 dias", value: 30 }, { label: "90 dias", value: 90 }];

export default function Dashboard() {
  const { isAuthenticated } = useAuth();
  const [period, setPeriod] = useState(30);
  const [, setLocation] = useLocation();

  const { data: stats, isLoading, error, refetch } = trpc.dashboard.stats.useQuery(
    { days: period },
    { enabled: isAuthenticated, retry: false, refetchInterval: 5 * 60 * 1000 }
  );
  const { data: budgetAlertsFired } = trpc.budgetAlerts.check.useQuery(undefined, { enabled: isAuthenticated });

  const platformData = stats ? Object.entries(stats.byPlatform).map(([name, data]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: Math.round((data.spent / (stats.totalSpent || 1)) * 100),
    color: PLATFORM_COLORS[name] || "#888",
  })) : [];

  const campaignChartData = (stats?.campaigns || []).slice(0, 8).map(c => ({
    name: c.name.length > 16 ? c.name.slice(0, 16) + "…" : c.name,
    gasto: parseFloat(c.spent?.toString() || "0"),
    cliques: c.clicks || 0,
    conversoes: c.conversions || 0,
  }));

  return (
    <DashboardLayout>
      {budgetAlertsFired && budgetAlertsFired.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-start gap-3">
          <AlertTriangle className="text-yellow-400 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-yellow-300 font-medium text-sm">⚠️ {budgetAlertsFired.length} alerta(s) de orçamento disparado(s)</p>
            {budgetAlertsFired.map((a: any) => (
              <p key={a.alert.id} className="text-yellow-400/80 text-xs mt-1">
                {a.campaign.name}: {a.spentPct.toFixed(1)}% do orçamento consumido
              </p>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-slate-400 text-sm mt-0.5">Performance das campanhas</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            {PERIOD_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setPeriod(opt.value)}
                className={`px-3 py-1.5 text-sm transition-all ${period === opt.value ? "bg-pink-600 text-white" : "text-slate-400 hover:text-white"}`}>
                {opt.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="border-slate-700 text-slate-300 hover:bg-slate-700">
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          Erro ao carregar dados: {error.message}
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Orçamento Gasto", value: `R$ ${(stats?.totalSpent || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-pink-500", hint: `Últimos ${period} dias` },
          { label: "Impressões", value: (stats?.totalImpressions || 0).toLocaleString('pt-BR'), icon: Users, color: "text-cyan-500", hint: "Visualizações totais" },
          { label: "Cliques", value: (stats?.totalClicks || 0).toLocaleString('pt-BR'), icon: TrendingUp, color: "text-pink-500", hint: `CTR: ${(stats?.avgCtr || 0).toFixed(2)}%` },
          { label: "Conversões", value: (stats?.totalConversions || 0).toLocaleString('pt-BR'), icon: Target, color: "text-cyan-500", hint: `CPC médio: R$ ${(stats?.avgCpc || 0).toFixed(2)}` },
        ].map(({ label, value, icon: Icon, color, hint }) => (
          <Card key={label} className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-slate-300 text-sm flex items-center gap-2">
                <Icon className={color} size={16} />{label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {isLoading ? <div className="h-8 w-24 bg-slate-700 rounded animate-pulse" /> : (
                <div className="text-2xl font-bold text-white">{value}</div>
              )}
              <p className="text-slate-500 text-xs mt-1">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {!isLoading && stats && stats.campaigns.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <Card className="lg:col-span-2 bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">Campanhas — Gasto vs Cliques</CardTitle>
              <CardDescription className="text-slate-400 text-xs">Top 8 campanhas</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={campaignChartData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: 8 }} labelStyle={{ color: "#e2e8f0" }} />
                  <Legend />
                  <Bar dataKey="gasto" fill="#ec4899" name="Gasto (R$)" radius={[4,4,0,0]} />
                  <Bar dataKey="cliques" fill="#06b6d4" name="Cliques" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">Por Plataforma</CardTitle>
              <CardDescription className="text-slate-400 text-xs">% do orçamento</CardDescription>
            </CardHeader>
            <CardContent>
              {platformData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={platformData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                      {platformData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-slate-500 text-sm text-center py-16">Nenhuma plataforma ainda</p>}
            </CardContent>
          </Card>
        </div>
      ) : !isLoading && (
        <Card className="bg-slate-800 border-slate-700 mb-4">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Sparkles className="text-slate-600" size={40} />
            <div className="text-center">
              <p className="text-slate-300 font-medium">Nenhuma campanha ainda</p>
              <p className="text-slate-500 text-sm mt-1">Conecte suas contas em Configurações para sincronizar campanhas</p>
            </div>
            <Button onClick={() => setLocation("/settings")} className="bg-pink-600 hover:bg-pink-700 text-white">
              Conectar plataformas
            </Button>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
