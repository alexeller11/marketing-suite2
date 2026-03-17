import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Loader2, TrendingUp, Users, DollarSign, Target } from "lucide-react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

export default function Dashboard() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { data: campaigns, isLoading, error: campaignsError } = trpc.campaigns.list.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <Loader2 className="animate-spin text-pink-500" size={48} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 gap-6">
        <h1 className="text-4xl font-bold text-white">Marketing Suite</h1>
        <p className="text-xl text-slate-300">Gerencie suas campanhas de marketing com IA</p>
        <Button
          onClick={() => window.location.href = getLoginUrl()}
          className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-3 text-lg"
        >
          Fazer Login
        </Button>
      </div>
    );
  }

  if (campaignsError) {
    console.error("[Dashboard] Error loading campaigns:", campaignsError);
  }

  // Dados de exemplo para gráficos
  const chartData = [
    { month: "Jan", spent: 4000, impressions: 24000, clicks: 1200, conversions: 240 },
    { month: "Fev", spent: 3000, impressions: 21000, clicks: 1221, conversions: 229 },
    { month: "Mar", spent: 2000, impressions: 29000, clicks: 200, conversions: 200 },
    { month: "Abr", spent: 2780, impressions: 39000, clicks: 2290, conversions: 200 },
    { month: "Mai", spent: 1890, impressions: 48000, clicks: 2181, conversions: 220 },
    { month: "Jun", spent: 2390, impressions: 38000, clicks: 2500, conversions: 229 },
  ];

  const platformData = [
    { name: "Meta Ads", value: 35, color: "#0A66C2" },
    { name: "Google Ads", value: 40, color: "#EA4335" },
    { name: "Instagram", value: 25, color: "#E1306C" },
  ];

  const totalSpent = campaigns?.reduce((sum, c) => sum + (parseFloat(c.spent?.toString() || "0")), 0) || 0;
  const totalImpressions = campaigns?.reduce((sum, c) => sum + (c.impressions || 0), 0) || 0;
  const totalClicks = campaigns?.reduce((sum, c) => sum + (c.clicks || 0), 0) || 0;
  const totalConversions = campaigns?.reduce((sum, c) => sum + (c.conversions || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">
              Marketing Suite
            </h1>
            <p className="text-slate-400 text-sm mt-1">Bem-vindo, {user?.name || "Usuário"}</p>
          </div>
          <nav className="flex gap-4">
            <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Campanhas
            </Button>
            <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Configurações
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800 border-slate-700 hover:border-pink-500/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-300 flex items-center gap-2">
                <DollarSign className="text-pink-500" size={20} />
                Orçamento Gasto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">R$ {totalSpent.toFixed(2)}</div>
              <p className="text-slate-400 text-sm mt-1">Últimos 30 dias</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-cyan-500/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-300 flex items-center gap-2">
                <Users className="text-cyan-500" size={20} />
                Impressões
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{totalImpressions.toLocaleString()}</div>
              <p className="text-slate-400 text-sm mt-1">Total de visualizações</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-pink-500/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-300 flex items-center gap-2">
                <TrendingUp className="text-pink-500" size={20} />
                Cliques
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{totalClicks.toLocaleString()}</div>
              <p className="text-slate-400 text-sm mt-1">Taxa de clique</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-cyan-500/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-300 flex items-center gap-2">
                <Target className="text-cyan-500" size={20} />
                Conversões
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{totalConversions.toLocaleString()}</div>
              <p className="text-slate-400 text-sm mt-1">Ações completadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Line Chart */}
          <Card className="lg:col-span-2 bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Desempenho das Campanhas</CardTitle>
              <CardDescription className="text-slate-400">Últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }}
                    labelStyle={{ color: "#e2e8f0" }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="spent" stroke="#ec4899" name="Orçamento Gasto" />
                  <Line type="monotone" dataKey="clicks" stroke="#06b6d4" name="Cliques" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Distribuição por Plataforma</CardTitle>
              <CardDescription className="text-slate-400">% do orçamento</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={platformData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {platformData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }}
                    labelStyle={{ color: "#e2e8f0" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Bar Chart */}
        <Card className="bg-slate-800 border-slate-700 mt-6">
          <CardHeader>
            <CardTitle className="text-white">Análise de Conversões</CardTitle>
            <CardDescription className="text-slate-400">Impressões vs Conversões</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Legend />
                <Bar dataKey="impressions" fill="#06b6d4" name="Impressões" />
                <Bar dataKey="conversions" fill="#ec4899" name="Conversões" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
