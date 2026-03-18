import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Key, CheckCircle, RefreshCw, Trash2, Bell } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Settings() {
  const { isAuthenticated } = useAuth();
  const [metaToken, setMetaToken] = useState("");
  const [metaAccountId, setMetaAccountId] = useState("");
  const [metaRefresh, setMetaRefresh] = useState("");
  const [googleToken, setGoogleToken] = useState("");
  const [googleRefresh, setGoogleRefresh] = useState("");
  const [syncingMeta, setSyncingMeta] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [alertCampaignId, setAlertCampaignId] = useState<string>("");

  const { data: metaCreds, refetch: refetchMeta } = trpc.integrations.getCredentials.useQuery("meta", { enabled: isAuthenticated });
  const { data: googleCreds, refetch: refetchGoogle } = trpc.integrations.getCredentials.useQuery("google", { enabled: isAuthenticated });
  const { data: alerts, refetch: refetchAlerts } = trpc.budgetAlerts.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: campaigns } = trpc.campaigns.list.useQuery(undefined, { enabled: isAuthenticated });

  const saveMeta = trpc.integrations.saveCredentials.useMutation({
    onSuccess: () => { toast.success("Credenciais Meta salvas!"); setMetaToken(""); setMetaRefresh(""); refetchMeta(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const saveGoogle = trpc.integrations.saveCredentials.useMutation({
    onSuccess: () => { toast.success("Credenciais Google salvas!"); setGoogleToken(""); setGoogleRefresh(""); refetchGoogle(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const syncMeta = trpc.sync.meta.useMutation({
    onSuccess: (data) => { toast.success(`${data.synced} campanha(s) sincronizada(s)!`); setSyncingMeta(false); },
    onError: (e) => { toast.error(`Erro: ${e.message}`); setSyncingMeta(false); },
  });
  const createAlert = trpc.budgetAlerts.create.useMutation({
    onSuccess: () => { toast.success("Alerta criado!"); refetchAlerts(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const deleteAlert = trpc.budgetAlerts.delete.useMutation({
    onSuccess: () => { toast.success("Alerta removido!"); refetchAlerts(); },
  });

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Configurações</h2>
        <p className="text-slate-400 text-sm mt-0.5">Conecte suas plataformas de anúncios</p>
      </div>
      <Tabs defaultValue="meta" className="w-full max-w-3xl">
        <TabsList className="grid w-full grid-cols-3 bg-slate-800 border border-slate-700 mb-6">
          <TabsTrigger value="meta" className="data-[state=active]:text-pink-400">Meta Ads</TabsTrigger>
          <TabsTrigger value="google" className="data-[state=active]:text-cyan-400">Google Ads</TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:text-yellow-400">Alertas</TabsTrigger>
        </TabsList>
        <TabsContent value="meta">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2"><Key className="text-pink-500" size={18} />Meta Ads</CardTitle>
                {metaCreds?.connected && <span className="flex items-center gap-1.5 text-green-400 text-sm"><CheckCircle size={14} />Conectado</span>}
              </div>
              <CardDescription className="text-slate-400">Configure seu Access Token do Meta Business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-sm text-slate-300">
                <p className="font-medium mb-1">Como obter:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-slate-400">
                  <li>Acesse <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:underline">developers.facebook.com</a></li>
                  <li>Seu App → Ferramentas → Explorador da API do Graph</li>
                  <li>Gere token com permissão <code className="text-pink-300">ads_read</code></li>
                  <li>Copie seu <strong>Ad Account ID</strong> no Gerenciador de Anúncios</li>
                </ol>
              </div>
              <div><Label className="text-slate-300">Access Token</Label><Input type="password" placeholder="EAAxxxxx..." value={metaToken} onChange={e => setMetaToken(e.target.value)} className="bg-slate-700 border-slate-600 text-white mt-1.5" /></div>
              <div><Label className="text-slate-300">Account ID</Label><Input placeholder="act_123456789" value={metaAccountId} onChange={e => setMetaAccountId(e.target.value)} className="bg-slate-700 border-slate-600 text-white mt-1.5" /></div>
              <div><Label className="text-slate-300">Refresh Token (opcional)</Label><Input type="password" value={metaRefresh} onChange={e => setMetaRefresh(e.target.value)} className="bg-slate-700 border-slate-600 text-white mt-1.5" /></div>
              <div className="flex gap-3">
                <Button onClick={() => { if (!metaToken) return toast.error("Informe o Access Token"); saveMeta.mutate({ platform: "meta", accessToken: metaToken, refreshToken: metaRefresh || undefined, accountId: metaAccountId || undefined }); }}
                  disabled={!metaToken || saveMeta.isPending} className="flex-1 bg-pink-600 hover:bg-pink-700 text-white">
                  {saveMeta.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null} Salvar Credenciais
                </Button>
                {metaCreds?.connected && (
                  <Button onClick={() => { if (!metaAccountId) return toast.error("Informe o Account ID"); setSyncingMeta(true); syncMeta.mutate({ accountId: metaAccountId }); }}
                    disabled={syncingMeta || !metaAccountId} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                    {syncingMeta ? <Loader2 className="animate-spin mr-2" size={16} /> : <RefreshCw size={16} className="mr-2" />} Sincronizar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="google">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2"><Key className="text-cyan-500" size={18} />Google Ads</CardTitle>
                {googleCreds?.connected && <span className="flex items-center gap-1.5 text-green-400 text-sm"><CheckCircle size={14} />Conectado</span>}
              </div>
              <CardDescription className="text-slate-400">Configure seu Access Token do Google Ads</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-sm text-slate-300">
                <p className="font-medium mb-1">Como obter:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-slate-400">
                  <li>Acesse <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">console.cloud.google.com</a></li>
                  <li>Habilite a Google Ads API</li>
                  <li>Crie credenciais OAuth 2.0 e gere os tokens</li>
                </ol>
              </div>
              <div><Label className="text-slate-300">Access Token</Label><Input type="password" value={googleToken} onChange={e => setGoogleToken(e.target.value)} className="bg-slate-700 border-slate-600 text-white mt-1.5" /></div>
              <div><Label className="text-slate-300">Refresh Token (opcional)</Label><Input type="password" value={googleRefresh} onChange={e => setGoogleRefresh(e.target.value)} className="bg-slate-700 border-slate-600 text-white mt-1.5" /></div>
              <Button onClick={() => { if (!googleToken) return toast.error("Informe o Access Token"); saveGoogle.mutate({ platform: "google", accessToken: googleToken, refreshToken: googleRefresh || undefined }); }}
                disabled={!googleToken || saveGoogle.isPending} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white">
                {saveGoogle.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null} Salvar Credenciais
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="alerts">
          <Card className="bg-slate-800 border-slate-700 mb-4">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2"><Bell className="text-yellow-500" size={18} />Criar Alerta de Orçamento</CardTitle>
              <CardDescription className="text-slate-400">Seja notificado quando o orçamento atingir o limite</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300">Campanha (opcional)</Label>
                <select value={alertCampaignId} onChange={e => setAlertCampaignId(e.target.value)} className="w-full bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2 mt-1.5 text-sm">
                  <option value="">Todas as campanhas</option>
                  {campaigns?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-slate-300">Threshold: {alertThreshold}% do orçamento</Label>
                <input type="range" min={10} max={100} step={5} value={alertThreshold} onChange={e => setAlertThreshold(Number(e.target.value))} className="w-full mt-2" />
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
                      <p className="text-slate-400 text-xs">{alert.lastTriggered ? `Disparado em ${new Date(alert.lastTriggered).toLocaleDateString('pt-BR')}` : "Nunca disparado"}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => deleteAlert.mutate({ id: alert.id })} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
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
