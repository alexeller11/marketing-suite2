import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, Megaphone, Settings, LogOut, Menu, BellRing, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { getLoginUrl } from "@/const";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/clients", label: "Clientes", icon: Users },
  { path: "/campaigns", label: "Campanhas", icon: Megaphone },
  { path: "/alerts", label: "Alertas", icon: BellRing },
  { path: "/settings", label: "Configurações", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <RefreshCw className="animate-spin text-pink-500" size={32} />
    </div>
  );

  if (!isAuthenticated) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 gap-6">
      <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-500">Marketing Suite</h1>
      <Button onClick={() => window.location.href = getLoginUrl()} className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-3 text-lg">
        Conectar com Google
      </Button>
    </div>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-slate-700/50">
        <h1 className="text-lg font-bold bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">Marketing Suite</h1>
        <p className="text-xs text-slate-500 mt-0.5">Gestão com IA</p>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = location === path || (path !== "/" && location.startsWith(path));
          return (
            <button key={path} onClick={() => { setLocation(path); setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${active ? "bg-pink-500/10 text-pink-400 border border-pink-500/20" : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"}`}>
              <Icon size={16} />{label}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-700/50">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
            {(user?.name || "U").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-200 truncate">{user?.name || "Usuário"}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email || ""}</p>
          </div>
        </div>
        <button onClick={() => logout()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-700/50 hover:text-red-400 transition-all">
          <LogOut size={15} /> Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 flex">
      <aside className="hidden lg:flex w-52 flex-col bg-slate-800/80 border-r border-slate-700/50 fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-52 bg-slate-800 border-r border-slate-700 z-50">
            <SidebarContent />
          </aside>
        </div>
      )}
      <div className="flex-1 lg:ml-52 flex flex-col min-h-screen">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-slate-800 border-b border-slate-700 sticky top-0 z-20">
          <button onClick={() => setMobileOpen(true)} className="text-slate-400 hover:text-white"><Menu size={20} /></button>
          <h1 className="text-base font-bold bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent flex-1">Marketing Suite</h1>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
