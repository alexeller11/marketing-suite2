import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import * as trpcExpress from "@trpc/server/adapters/express";

// Importações que ligam a sua lógica de negócio ao servidor
import { appRouter } from "../routers";
import { createContext } from "./context";
import authRoutes from "../auth-routes";
import { setupVite, serveStatic } from "./vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares básicos para APIs
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 1. Registar rotas de autenticação (Google, Meta)
app.use("/api/auth", authRoutes);

// 2. Registar o middleware do tRPC (Comunicação Frontend <-> Backend)
app.use(
  "/api/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Rota de teste
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// 3. Inicialização do Servidor com suporte ao Vite
async function startServer() {
  const server = http.createServer(app);

  if (process.env.NODE_ENV !== "production") {
    // No modo de desenvolvimento, o Vite injeta o frontend na mesma porta (5000)
    await setupVite(app, server);
  } else {
    // No modo de produção, serve os ficheiros estáticos gerados na pasta dist
    serveStatic(app);
  }

  const PORT = Number(process.env.PORT) || 5000;
  
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch(console.error);
