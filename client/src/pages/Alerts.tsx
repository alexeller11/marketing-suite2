import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, AlertTriangle, CheckCircle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Alerts() {
  const { isAuthenticated } = useAuth();
  const { data: triggered } = trpc.budgetAlerts.check.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 60000 });
  const { data: alerts } = trpc.budgetAlerts.list.useQuery(undefined, { enabled: isAuthenticated });

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Bell size={22} className="text-yellow-400" />Alertas</h2>
        <p className="text-slate-400 text-sm mt-0.5">Monitoramento de orçamento em tempo real</p>
      </div>
      {triggered && triggered.length > 0 ? (
        <div className="space-y-3 mb-6">
          <h3 className="text-sm font-medium text-yellow-400 uppercase tracking-wide">Alertas disparados</h3>
          {triggered.map((item: any) => (
            <Card key={item.alert.id} className="bg-yellow-500/10 border-yellow-500/30">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertTriangle className="text-yellow-400 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-yellow-300 font-medium">{item.campaign.name}</p>
                  <p className="text-yellow-400/80 text-sm mt-0.5">{item.spentPct.toFixed(1)}% do orçamento consumido (limite: {item.alert.threshold}%)</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle className="text-green-400" size={18} />
            <p className="text-green-300 text-sm">Nenhum alerta disparado. Todos os orçamentos estão dentro do limite.</p>
          </CardContent>
        </Card>
      )}
      <div>
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">Alertas configurados ({alerts?.length || 0})</h3>
        {alerts?.length === 0 && <p className="text-slate-500 text-sm">Nenhum alerta configurado. Crie em Configurações → Alertas.</p>}
        <div className="space-y-2">
          {alerts?.map((alert: any) => (
            <Card key={alert.id} className="bg-slate-800 border-slate-700">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell size={14} className="text-yellow-400" />
                  <span className="text-white text-sm">Alerta em {alert.threshold}%</span>
                </div>
                <span className="text-slate-500 text-xs">{alert.lastTriggered ? `Disparado ${new Date(alert.lastTriggered).toLocaleDateString('pt-BR')}` : "Nunca disparado"}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
```
