import express from "express";
import path from "path";
import { fileURLToPath } from "url";

// Configuração para suportar __dirname em ES Modules (necessário para o seu "type": "module")
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares básicos para APIs
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/**
 * --- SUAS ROTAS COMEÇAM AQUI ---
 * Se você tiver rotas importadas, coloque-as aqui.
 * Exemplo: app.use("/api", minhaRota);
 */

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

/**
 * --- CONFIGURAÇÃO DE PRODUÇÃO (RENDER) ---
 * O seu script de build coloca o front-end em dist/public ou dist.
 * Ajustamos abaixo para servir esses arquivos.
 */
if (process.env.NODE_ENV === "production") {
  // Serve os arquivos estáticos da pasta dist
  const publicPath = path.resolve(__dirname, "public");
  app.use(express.static(publicPath));

  // Fallback para Single Page Application (React/Wouter)
  app.get("*", (req, res) => {
    // Se a rota não começar com /api, entrega o index.html
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.join(publicPath, "index.html"));
    }
  });
}

/**
 * --- INICIALIZAÇÃO DO SERVIDOR ---
 * O Render exige o uso da porta via process.env.PORT
 * O host '0.0.0.0' é obrigatório para deploy em nuvem.
 */
const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
