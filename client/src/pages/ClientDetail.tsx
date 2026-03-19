import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Sparkles, RefreshCw, TrendingUp, TrendingDown, Minus, Edit2, Save, X, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";

function fmt(n: number) { return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtN(n: number) { return n.toLocaleString('pt-BR'); }

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  paused: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  completed: "bg-slate-500/20 text-slate-400",
  draft: "bg-blue-500/20 text-blue-400",
};

export default function ClientDetail() {
  const { isAuthenticated } = useAuth();
  const params = useParams<{ id: string }>();
  const clientId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState(30);
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ monthlyBudget: "", paymentMethod: "", notes: "" });
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const { data: client, refetch: refetchClient } = trpc.clients.get.useQuery({ id: clientId }, { enabled: isAuthenticated && clientId > 0 });
  const { data: campaigns, isLoading: loadingCampaigns, refetch: refetchCampaigns } = trpc.clients.campaigns.useQuery(
    { clientId, status: statusFilter, days: period },
    { enabled: isAuthenticated && clientId > 0 }
  );
  const { data: aiHistory } = trpc.clients.aiHistory.useQuery({ clientId }, { enabled: isAuthenticated && clientId > 0 });

  const updateClient = trpc.clients.update.useMutation({
    onSuccess: () => { toast.success("Cliente atualizado!"); setEditing(false); refetchClient(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const analyzeClient = trpc.ai.analyzeClient.useMutation({
    onSuccess: (data) => { setAnalysis(data); setAnalyzing(false); toast.success("Análise concluída!"); },
    onError: (e) => { toast.error(`Erro: ${e.message}`); setAnalyzing(false); },
  });
  const syncAccount = trpc.sync.metaAccount.useMutation({
    onSuccess: (data) => { toast.success(`${data.synced} campanha(s) sincronizada(s)!`); refetchCampaigns(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const totalSpent = (campaigns || []).reduce((s: number, c: any) => s + parseFloat(c.spent?.toString() || "0"), 0);
  const totalImpressions = (campaigns || []).reduce((s: number, c: any) => s + (c.impressions || 0), 0);
  const totalClicks = (campaigns || []).reduce((s: number, c: any) => s + (c.clicks || 0), 0);
  const totalConversions = (campaigns || []).reduce((s: number, c: any) => s + (c.conversions || 0), 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpc = totalClicks > 0 ? totalSpent / totalClicks : 0;
  const avgRoas = (campaigns || []).length > 0
    ? (campaigns || []).reduce((s: number, c: any) => s + parseFloat(c.roas?.toString() || "0"), 0) / (campaigns || []).length
    : 0;
  const monthlyBudget = parseFloat(client?.monthlyBudget?.toString() || "0");
  const budgetPct = monthlyBudget > 0 ? (totalSpent / monthlyBudget) * 100 : 0;

  const handleAnalyze = () => {
    setAnalyzing(true);
    analyzeClient.mutate({ clientId, period: `últimos ${period} dias`, days: period });
  };

  const startEdit = () => {
    setEditData({
      monthlyBudget: client?.monthlyBudget?.toString() || "",
      paymentMethod: client?.paymentMethod || "",
      notes: client?.notes || "",
    });
    setEditing(true);
  };

  if (!client) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-pink-500" size={32} />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-start gap-4 mb-5 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/clients")} className="text-slate-400 hover:text-white">
          <ArrowLeft size={16} className="mr-1" /> Voltar
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{client.name}</h2>
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 mt-0.5">
                {client.paymentMethod && <span className="bg-slate-700 px-2 py-0.5 rounded-full">{client.paymentMethod}</span>}
                {client.platform && <span className="bg-slate-700 px-2 py-0.5 rounded-full capitalize">{client.platform}</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={startEdit} className="border-slate-700 text-slate-300 hover:bg-slate-700">
            <Edit2 size={14} className="mr-1" /> Editar
          </Button>
          <Button onClick={handleAnalyze} disabled={analyzing}
            className="bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-700 hover:to-cyan-700 text-white">
            {analyzing ? <RefreshCw size={14} className="animate-spin mr-2" /> : <Sparkles size={14} className="mr-2" />}
            Analisar com IA
          </Button>
        </div>
      </div>

      {/* Edit Panel */}
      {editing && (
        <Card className="bg-slate-800 border-pink-500/30 mb-5">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-slate-300 text-xs">Verba Mensal (R$)</Label>
                <Input type="number" value={editData.monthlyBudget} onChange={e => setEditData(d => ({ ...d, monthlyBudget: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white mt-1" />
              </div>
              <div>
                <Label className="text-slate-300 text-xs">Forma de Pagamento</Label>
                <Input value={editData.paymentMethod} onChange={e => setEditData(d => ({ ...d, paymentMethod: e.target.value }))}
                  placeholder="Ex: Boleto, Cartão..." className="bg-slate-700 border-slate-600 text-white mt-1" />
              </div>
              <div>
                <Label className="text-slate-300 text-xs">Observações</Label>
                <Input value={editData.notes} onChange={e => setEditData(d => ({ ...d, notes: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white mt-1" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={() => updateClient.mutate({ id: clientId, ...editData, monthlyBudget: editData.monthlyBudget ? parseFloat(editData.monthlyBudget) : undefined })}
                disabled={updateClient.isPending} className="bg-pink-600 hover:bg-pink-700 text-white">
                <Save size={13} className="mr-1" /> Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="text-slate-400">
                <X size={13} className="mr-1" /> Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs do Cliente */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Investido", value: `R$ ${fmt(totalSpent)}`, sub: monthlyBudget > 0 ? `${budgetPct.toFixed(1)}% da verba` : "Sem verba definida", alert: budgetPct > 90 },
          { label: "Impressões", value: fmtN(totalImpressions), sub: `CTR: ${avgCtr.toFixed(2)}%` },
          { label: "Cliques", value: fmtN(totalClicks), sub: `CPC: R$ ${fmt(avgCpc)}` },
          { label: "Conversões", value: fmtN(totalConversions), sub: `ROAS: ${avgRoas.toFixed(2)}x` },
        ].map(({ label, value, sub, alert }) => (
          <Card key={label} className={`border ${alert ? "bg-red-500/10 border-red-500/30" : "bg-slate-800 border-slate-700"}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 mb-1">
                {alert && <AlertTriangle size={12} className="text-red-400" />}
                <span className="text-slate-400 text-xs">{label}</span>
              </div>
              <div className="text-xl font-bold text-white">{value}</div>
              <p className={`text-xs mt-0.5 ${alert ? "text-red-400" : "text-slate-500"}`}>{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {monthlyBudget > 0 && (
        <Card className="bg-slate-800 border-slate-700 mb-5">
          <CardContent className="p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-300 font-medium">Verba mensal: R$ {fmt(monthlyBudget)}</span>
              <span className={`font-medium ${budgetPct > 90 ? "text-red-400" : budgetPct > 70 ? "text-yellow-400" : "text-green-400"}`}>
                R$ {fmt(totalSpent)} investido ({budgetPct.toFixed(1)}%)
              </span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${budgetPct > 90 ? "bg-red-500" : budgetPct > 70 ? "bg-yellow-500" : "bg-green-500"}`}
                style={{ width: `${Math.min(budgetPct, 100)}%` }} />
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="campaigns">
        <TabsList className="bg-slate-800 border border-slate-700 mb-4">
          <TabsTrigger value="campaigns" className="data-[state=active]:text-pink-400">Campanhas</TabsTrigger>
          <TabsTrigger value="analysis" className="data-[state=active]:text-cyan-400">Análise IA</TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:text-yellow-400">Histórico IA</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="flex bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
              {[{ label: "7d", value: 7 }, { label: "30d", value: 30 }, { label: "90d", value: 90 }].map(o => (
                <button key={o.value} onClick={() => setPeriod(o.value)}
                  className={`px-3 py-1.5 text-xs transition-all ${period === o.value ? "bg-pink-600 text-white" : "text-slate-400 hover:text-white"}`}>
                  {o.label}
                </button>
              ))}
            </div>
            <div className="flex bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
              {[{ label: "Todas", value: "all" }, { label: "Ativas", value: "active" }, { label: "Pausadas", value: "paused" }].map(o => (
                <button key={o.value} onClick={() => setStatusFilter(o.value)}
                  className={`px-3 py-1.5 text-xs transition-all ${statusFilter === o.value ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"}`}>
                  {o.label}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchCampaigns()} className="border-slate-700 text-slate-300 hover:bg-slate-700 ml-auto">
              <RefreshCw size={13} className={loadingCampaigns ? "animate-spin" : ""} />
            </Button>
          </div>

          {loadingCampaigns ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse" />)}</div>
          ) : (campaigns || []).length > 0 ? (
            <div className="space-y-2">
              {(campaigns || []).map((c: any) => {
                const spent = parseFloat(c.spent?.toString() || "0");
                const ctr = parseFloat(c.ctr?.toString() || "0");
                const roas = parseFloat(c.roas?.toString() || "0");
                const ctrIcon = ctr > 2 ? <TrendingUp size={12} className="text-green-400" /> : ctr > 1 ? <Minus size={12} className="text-yellow-400" /> : <TrendingDown size={12} className="text-red-400" />;
                return (
                  <Card key={c.id} className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <h4 className="text-white text-sm font-medium truncate">{c.name}</h4>
                            <span className={`text-xs px-1.5 py-0.5 rounded border ${STATUS_COLORS[c.status] || STATUS_COLORS.draft}`}>
                              {c.status === "active" ? "Ativa" : c.status === "paused" ? "Pausada" : c.status}
                            </span>
                            {c.objective && <span className="text-xs text-slate-500">{c.objective}</span>}
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
                            <div><span className="text-slate-500">Gasto</span><p className="text-white font-medium">R$ {fmt(spent)}</p></div>
                            <div><span className="text-slate-500">Impressões</span><p className="text-white font-medium">{fmtN(c.impressions || 0)}</p></div>
                            <div><span className="text-slate-500">Cliques</span><p className="text-white font-medium">{fmtN(c.clicks || 0)}</p></div>
                            <div><span className="text-slate-500">CTR</span><p className="text-white font-medium flex items-center gap-0.5">{ctrIcon}{ctr.toFixed(2)}%</p></div>
                            <div><span className="text-slate-500">CPC</span><p className="text-white font-medium">R$ {fmt(parseFloat(c.cpc?.toString() || "0"))}</p></div>
                            <div><span className="text-slate-500">ROAS</span><p className={`font-medium ${roas >= 3 ? "text-green-400" : roas >= 1 ? "text-yellow-400" : "text-red-400"}`}>{roas.toFixed(2)}x</p></div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-8">Nenhuma campanha encontrada para este filtro</p>
          )}
        </TabsContent>

        <TabsContent value="analysis">
          {analysis ? (
            <div className="space-y-4">
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-4 ${analysis.score >= 70 ? "border-green-500 text-green-400" : analysis.score >= 40 ? "border-yellow-500 text-yellow-400" : "border-red-500 text-red-400"}`}>
                      {analysis.score}
                    </div>
                    <div>
                      <p className="text-white font-medium">Score de Saúde</p>
                      <p className="text-slate-400 text-sm">{analysis.score >= 70 ? "Campanhas saudáveis" : analysis.score >= 40 ? "Atenção necessária" : "Situação crítica"}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${analysis.sentiment === "positive" ? "bg-green-500/20 text-green-400" : analysis.sentiment === "negative" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                    {analysis.sentiment === "positive" ? "✓ Positivo" : analysis.sentiment === "negative" ? "✗ Negativo" : "◐ Neutro"}
                  </span>
                </CardContent>
              </Card>

              {analysis.alerts?.length > 0 && (
                <Card className="bg-red-500/10 border-red-500/30">
                  <CardHeader className="pb-2"><CardTitle className="text-red-400 text-sm flex items-center gap-2"><AlertTriangle size={16} />Alertas Urgentes</CardTitle></CardHeader>
                  <CardContent className="space-y-1.5">
                    {analysis.alerts.map((alert: string, i: number) => (
                      <p key={i} className="text-red-300 text-sm">• {alert}</p>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-2"><CardTitle className="text-white text-base">Análise Completa</CardTitle></CardHeader>
                <CardContent><div className="prose prose-invert prose-sm max-w-none"><Streamdown>{analysis.analysis}</Streamdown></div></CardContent>
              </Card>

              {analysis.recommendations?.length > 0 && (
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-2"><CardTitle className="text-white text-base">Otimizações Prioritárias</CardTitle></CardHeader>
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
            </div>
          ) : (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="flex flex-col items-center justify-center py-14 gap-4">
                <Sparkles className="text-slate-600" size={40} />
                <p className="text-slate-300 font-medium">Nenhuma análise ainda</p>
                <p className="text-slate-500 text-sm text-center">Clique em "Analisar com IA" para gerar um relatório completo com otimizações e alertas</p>
                <Button onClick={handleAnalyze} disabled={analyzing}
                  className="bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-700 hover:to-cyan-700 text-white">
                  {analyzing ? <RefreshCw size={14} className="animate-spin mr-2" /> : <Sparkles size={14} className="mr-2" />}
                  Analisar com IA
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          {aiHistory && aiHistory.length > 0 ? (
            <div className="space-y-2">
              {aiHistory.map((h: any) => (
                <Card key={h.id} className="bg-slate-800 border-slate-700">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">{h.prompt}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{new Date(h.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    {h.score && (
                      <span className={`text-sm font-bold ${h.score >= 70 ? "text-green-400" : h.score >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                        {h.score}/100
                      </span>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-8">Nenhuma análise salva ainda</p>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
