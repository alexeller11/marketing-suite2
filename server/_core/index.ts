import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from "url";

// --- SEUS IMPORTS DE ROTAS AQUI ---
// Exemplo: import { apiRouter } from "./routes"; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares básicos
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- SUAS ROTAS AQUI ---
// app.use("/api", apiRouter);

/**
 * CONFIGURAÇÃO PARA DEPLOY (Vite + Express)
 * Isso garante que o Express sirva os arquivos do Front-end após o build
 */
if (process.env.NODE_ENV === "production") {
  // Caminho para a pasta 'dist/public' onde o Vite coloca o build do front
  const publicPath = path.resolve(__dirname, "public");
  
  app.use(express.static(publicPath));

  // Qualquer rota que não seja da API, serve o index.html (SPA)
  app.get("*", (req, res) => {
    res.sendFile(path.join(publicPath, "index.html"));
  });
} else {
  // Rota de fallback para desenvolvimento
  app.get("/", (_req, res) => {
    res.send("Server is running in development mode...");
  });
}

/**
 * INICIALIZAÇÃO DO SERVIDOR
 * Essencial para o Render: Porta dinâmica e Host 0.0.0.0
 */
const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server ready on port ${PORT}`);
});
