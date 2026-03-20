import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import * as trpcExpress from "@trpc/server/adapters/express";

import { appRouter } from "../routers";
import { createContext } from "./context";
import authRoutes from "../auth-routes";
import { setupVite, serveStatic } from "./vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 1. Liga as rotas de Autenticação (Google, Meta)
app.use("/api/auth", authRoutes);

// 2. Liga a API de dados (tRPC)
app.use(
  "/api/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "Server is running on Render!" });
});

// 3. Inicializa o servidor corretamente para o Render (Produção)
async function startServer() {
  const server = http.createServer(app);

  if (process.env.NODE_ENV !== "production") {
    await setupVite(app, server);
  } else {
    // No Render, é isto que faz a sua interface gráfica (React) aparecer!
    serveStatic(app);
  }

  const PORT = Number(process.env.PORT) || 5000;
  
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch(console.error);
