import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Key, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("meta");
  const [loading, setLoading] = useState(false);

  // Meta Credentials
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [metaRefreshToken, setMetaRefreshToken] = useState("");

  // Google Credentials
  const [googleAccessToken, setGoogleAccessToken] = useState("");
  const [googleRefreshToken, setGoogleRefreshToken] = useState("");

  const saveMetaCredentials = trpc.integrations.saveCredentials.useMutation({
    onSuccess: () => {
      toast.success("Credenciais Meta salvas com sucesso!");
      setMetaAccessToken("");
      setMetaRefreshToken("");
    },
    onError: (error) => {
      toast.error(`Erro ao salvar credenciais: ${error.message}`);
    },
  });

  const saveGoogleCredentials = trpc.integrations.saveCredentials.useMutation({
    onSuccess: () => {
      toast.success("Credenciais Google salvas com sucesso!");
      setGoogleAccessToken("");
      setGoogleRefreshToken("");
    },
    onError: (error) => {
      toast.error(`Erro ao salvar credenciais: ${error.message}`);
    },
  });

  const handleSaveMetaCredentials = async () => {
    if (!metaAccessToken) {
      toast.error("Por favor, forneça o Access Token do Meta");
      return;
    }

    setLoading(true);
    try {
      await saveMetaCredentials.mutateAsync({
        platform: "meta",
        accessToken: metaAccessToken,
        refreshToken: metaRefreshToken,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoogleCredentials = async () => {
    if (!googleAccessToken) {
      toast.error("Por favor, forneça o Access Token do Google");
      return;
    }

    setLoading(true);
    try {
      await saveGoogleCredentials.mutateAsync({
        platform: "google",
        accessToken: googleAccessToken,
        refreshToken: googleRefreshToken,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <p className="text-slate-300">Você precisa estar autenticado para acessar esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">
            Configurações
          </h1>
          <p className="text-slate-400 text-sm mt-1">Gerencie suas credenciais de integração</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800 border border-slate-700">
            <TabsTrigger value="meta" className="text-slate-300 data-[state=active]:text-pink-500">
              Meta Ads
            </TabsTrigger>
            <TabsTrigger value="google" className="text-slate-300 data-[state=active]:text-cyan-500">
              Google Ads
            </TabsTrigger>
            <TabsTrigger value="instagram" className="text-slate-300 data-[state=active]:text-pink-500">
              Instagram
            </TabsTrigger>
          </TabsList>

          {/* Meta Ads Tab */}
          <TabsContent value="meta" className="mt-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Key className="text-pink-500" size={20} />
                  Credenciais Meta Ads
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Configure suas credenciais de acesso ao Meta Ads Manager
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="text-yellow-500 flex-shrink-0" size={20} />
                  <div className="text-sm text-slate-300">
                    <p className="font-semibold mb-1">Instruções:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Acesse <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:underline">Facebook Developers</a></li>
                      <li>Vá para Meus Apps e selecione seu aplicativo</li>
                      <li>Copie o App ID e App Secret</li>
                      <li>Gere um Access Token com permissões ads_management</li>
                    </ol>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="meta-access-token" className="text-slate-300">
                      Access Token
                    </Label>
                    <Input
                      id="meta-access-token"
                      type="password"
                      placeholder="Seu Access Token do Meta"
                      value={metaAccessToken}
                      onChange={(e) => setMetaAccessToken(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="meta-refresh-token" className="text-slate-300">
                      Refresh Token (Opcional)
                    </Label>
                    <Input
                      id="meta-refresh-token"
                      type="password"
                      placeholder="Seu Refresh Token do Meta"
                      value={metaRefreshToken}
                      onChange={(e) => setMetaRefreshToken(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 mt-2"
                    />
                  </div>

                  <Button
                    onClick={handleSaveMetaCredentials}
                    disabled={loading || !metaAccessToken}
                    className="w-full bg-pink-600 hover:bg-pink-700 text-white"
                  >
                    {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
                    Salvar Credenciais Meta
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Google Ads Tab */}
          <TabsContent value="google" className="mt-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Key className="text-cyan-500" size={20} />
                  Credenciais Google Ads
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Configure suas credenciais de acesso ao Google Ads
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="text-yellow-500 flex-shrink-0" size={20} />
                  <div className="text-sm text-slate-300">
                    <p className="font-semibold mb-1">Instruções:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Acesse <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline">Google Cloud Console</a></li>
                      <li>Habilite a Google Ads API</li>
                      <li>Crie credenciais OAuth 2.0</li>
                      <li>Gere um Access Token e Refresh Token</li>
                    </ol>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="google-access-token" className="text-slate-300">
                      Access Token
                    </Label>
                    <Input
                      id="google-access-token"
                      type="password"
                      placeholder="Seu Access Token do Google"
                      value={googleAccessToken}
                      onChange={(e) => setGoogleAccessToken(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="google-refresh-token" className="text-slate-300">
                      Refresh Token (Opcional)
                    </Label>
                    <Input
                      id="google-refresh-token"
                      type="password"
                      placeholder="Seu Refresh Token do Google"
                      value={googleRefreshToken}
                      onChange={(e) => setGoogleRefreshToken(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 mt-2"
                    />
                  </div>

                  <Button
                    onClick={handleSaveGoogleCredentials}
                    disabled={loading || !googleAccessToken}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                  >
                    {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
                    Salvar Credenciais Google
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Instagram Tab */}
          <TabsContent value="instagram" className="mt-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Key className="text-pink-500" size={20} />
                  Credenciais Instagram Ads
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Configure suas credenciais de acesso ao Instagram Ads
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="text-yellow-500 flex-shrink-0" size={20} />
                  <div className="text-sm text-slate-300">
                    <p className="font-semibold mb-1">Nota:</p>
                    <p>As credenciais do Instagram Ads são gerenciadas através do Meta. Use as mesmas credenciais da aba Meta Ads.</p>
                  </div>
                </div>

                <div className="text-center py-8">
                  <p className="text-slate-400">Configure as credenciais Meta para gerenciar campanhas do Instagram</p>
                  <Button
                    onClick={() => setActiveTab("meta")}
                    variant="outline"
                    className="mt-4 border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Ir para Meta Ads
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
