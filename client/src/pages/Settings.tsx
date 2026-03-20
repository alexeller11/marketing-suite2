import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, RefreshCw, Trash2, Bell, Link, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Settings() {
  const { isAuthenticated } = useAuth();
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [alertCampaignId, setAlertCampaignId] = useState("");
  const [selectedGoogleAccount, setSelectedGoogleAccount] = useState("");
  const [googleAccounts, setGoogleAccounts] = useState<any[]>([]);
  const [loadingGoogleAccounts, setLoadingGoogleAccounts] = useState(false);
  const [googleWarning, setGoogleWarning] = useState("");

  const { data: googleCreds, refetch: refetchGoogle } = trpc.integrations.getCredentials.useQuery("google", { enabled: isAuthenticated });
  const { data: alerts, refetch: refetchAlerts } = trpc.budgetAlerts.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: campaigns } = trpc.campaigns.list.useQuery(undefined, { enabled: isAuthenticated });
  const { refetch: refetchStatus } = trpc.sync.status.useQuery(undefined, { enabled: isAuthenticated });

  const syncGoogle = trpc.sync.google.useMutation({
    onSuccess: (d) => { toast.success(`${d.synced} campanha(s) sincronizada(s)!`); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const createAlert = trpc.budgetAlerts.create.useMutation({
    onSuccess: () => { toast.success("Alerta criado!"); refetchAlerts(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const deleteAlert = trpc.budgetAlerts.delete.useMutation({
    onSuccess: () => { toast.success("Removido!"); refetchAlerts(); },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");
    if (success === "google_ads_connected") { toast.success("Google Ads conectado!"); refetchGoogle(); refetchStatus(); }
    else if (error) toast.error(`Erro: ${error.replace(/_/g, " ")}`);
    if (success || error) window.history.replaceState({}, "", "/settings");
  }, []);

  useEffect(() => {
    if (googleCreds?.connected) {
      setLoadingGoogleAccounts(true);
      fetch("/api/auth/google-ads/accounts", { credentials: "include" })
        .then(r => r.json())
        .then(d => {
          if (d.warning) { setGoogleWarning(d.warning); }
          setGoogleAccounts(d.accounts || []);
        })
        .catch(() => toast.error("Erro ao carregar contas Google"))
        .finally(() => setLoadingGoogleAccounts(false));
    }
  }, [googleCreds?.connected]);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Configurações</h2>
        <p className="text-slate-400 text-sm mt-0.5">Conecte e gerencie sua plataforma Google Ads</p>
      </div>

      <Tabs defaultValue="google" className="w-full max-w-3xl">
        <TabsList className="grid w-full grid-cols-2 bg-slate-800 border border-slate-700 mb-6">
          <TabsTrigger value="google" className="data-[state=active]:text-cyan-400">Google Ads</TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:text-yellow-400">Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="google" className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-white flex items-center justify-center text-xs font-bold text-red-500">G</div>
                  Google Ads
                </CardTitle>
                {googleCreds?.connected
                  ? <span className="flex items-center gap-1.5 text-green-400 text-sm"><CheckCircle size={14} />Conectado</span>
                  : <span className="flex items-center gap-1.5 text-slate-500 text-sm"><AlertCircle size={14} />Não conectado</span>}
              </div>
              <CardDescription className="text-slate-400">OAuth automático via Google</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!googleCreds?.connected ? (
                <Button onClick={() => { window.location.href = "/api/auth/google-ads/login"; }} className="w-full bg-red-600 hover:bg-red-700 text-white">
                  <Link size={16} className="mr-2" /> Conectar Google Ads
                </Button>
              ) : (
                <div className="space-y-3">
                  {loadingGoogleAccounts ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm p-3"><Loader2 className="animate-spin" size={16} /> Carregando contas...</div>
                  ) : (
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-slate-300 text-sm font-medium mb-2">Contas disponíveis ({googleAccounts.length})</p>
                      {googleWarning && <p className="text-yellow-400 text-xs mb-3 flex items-center gap-1"><AlertCircle size={12}/> {googleWarning}</p>}
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {googleAccounts.map((acc: any) => (
                          <label key={acc.id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-slate-600/50">
                            <input type="radio" name="googleAccount" value={acc.id}
                              checked={selectedGoogleAccount === acc.id}
                              onChange={() => setSelectedGoogleAccount(acc.id)}
                              className="accent-cyan-500" />
                            <span className="text-white text-sm flex-1">{acc.name}</span>
                            <span className="text-slate-500 text-xs">{acc.id}</span>
                          </label>
                        ))}
                        {googleAccounts.length === 0 && !googleWarning && (
                           <p className="text-slate-500 text-xs">Nenhuma conta encontrada nesta conta Google.</p>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={() => { if (!selectedGoogleAccount) return toast.error("Selecione uma conta"); syncGoogle.mutate({ customerId: selectedGoogleAccount }); }}
                      disabled={syncGoogle.isPending || !selectedGoogleAccount} className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white">
                      {syncGoogle.isPending ? <Loader2 className="animate-spin mr-2" size={15} /> : <RefreshCw size={15} className="mr-2" />}
                      Sincronizar Dados
                    </Button>
                    <Button onClick={() => { window.location.href = "/api/auth/google-ads/login"; }} variant="outline" size="sm" className="border-slate-600 text-slate-400 hover:bg-slate-700 text-xs">
                      Reconectar / Renovar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2"><Bell className="text-yellow-500" size={18} />Criar Alerta</CardTitle>
              <CardDescription className="text-slate-400">Notificação automática de orçamento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300">Campanha (opcional)</Label>
                <select value={alertCampaignId} onChange={e => setAlertCampaignId(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2 mt-1.5 text-sm">
                  <option value="">Todas as campanhas</option>
                  {campaigns?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-slate-300">Limite: {alertThreshold}% do orçamento</Label>
                <input type="range" min={10} max={100} step={5} value={alertThreshold}
                  onChange={e => setAlertThreshold(Number(e.target.value))} className="w-full mt-2" />
              </div>
              <Button onClick={() => createAlert.mutate({ campaignId: alertCampaignId ? Number(alertCampaignId) : undefined, threshold: alertThreshold })}
                disabled={createAlert.isPending} className="w-full bg-yellow-600 hover:bg-yellow-700 text-white">
                {createAlert.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null} Criar Alerta
              </Button>
            </CardContent>
          </Card>
          {alerts && alerts.length > 0 && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader><CardTitle className="text-white text-base">Alertas ativos</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {alerts.map((alert: any) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <div>
                      <p className="text-white text-sm font-medium">Alerta {alert.threshold}%</p>
                      <p className="text-slate-400 text-xs">{alert.lastTriggered ? `Disparado ${new Date(alert.lastTriggered).toLocaleDateString('pt-BR')}` : "Nunca disparado"}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => deleteAlert.mutate({ id: alert.id })} className="text-red-400 hover:bg-red-500/10">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
