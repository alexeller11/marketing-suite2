import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import * as trpcExpress from "@trpc/server/adapters/express";

import { appRouter } from "../routers";
import { createContext } from "./context";
import authRoutes from "../auth-routes";
import { serveStatic } from "./vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/api/auth", authRoutes);

app.use(
  "/api/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

if (process.env.NODE_ENV === "production") {
  serveStatic(app);
}

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
