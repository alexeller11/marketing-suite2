import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  useEffect(() => {
    // Get Google login URL from backend
    const fetchAuthUrl = async () => {
      try {
        const response = await fetch("/api/auth/google/login");
        const data = await response.json();
        setAuthUrl(data.authUrl);
      } catch (error) {
        console.error("Failed to fetch auth URL:", error);
      }
    };

    fetchAuthUrl();
  }, []);

  const handleGoogleLogin = () => {
    if (authUrl) {
      setLoading(true);
      window.location.href = authUrl;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 gap-6 p-4">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-500">
          MARKETING SUITE
        </h1>
        <p className="text-xl text-slate-300">
          Gerencie suas campanhas de marketing com IA
        </p>

        <div className="text-sm text-slate-400 max-w-md mx-auto">
          <p>
            Análise inteligente de campanhas Meta Ads, Instagram e Google Ads
            com recomendações personalizadas usando IA.
          </p>
        </div>
      </div>

      <Button
        onClick={handleGoogleLogin}
        disabled={loading || !authUrl}
        className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-3 text-lg"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Conectando...
          </>
        ) : (
          "Conectar com Google"
        )}
      </Button>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
        <div className="text-center p-4 border border-cyan-500/20 rounded-lg bg-cyan-500/5">
          <div className="text-cyan-400 text-2xl mb-2">📊</div>
          <h3 className="text-white font-semibold mb-1">Dashboard</h3>
          <p className="text-sm text-slate-400">Métricas em tempo real</p>
        </div>

        <div className="text-center p-4 border border-pink-500/20 rounded-lg bg-pink-500/5">
          <div className="text-pink-400 text-2xl mb-2">🤖</div>
          <h3 className="text-white font-semibold mb-1">IA Integrada</h3>
          <p className="text-sm text-slate-400">Análises inteligentes</p>
        </div>

        <div className="text-center p-4 border border-purple-500/20 rounded-lg bg-purple-500/5">
          <div className="text-purple-400 text-2xl mb-2">⚡</div>
          <h3 className="text-white font-semibold mb-1">Rápido</h3>
          <p className="text-sm text-slate-400">Performance otimizada</p>
        </div>
      </div>
    </div>
  );
}
