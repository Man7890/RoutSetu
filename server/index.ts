import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";
import { createRepo } from "./lib/repo.ts";
import { LiveCrowd } from "./lib/live.ts";
import { apiRouter } from "./routes/api.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3001);
const isProd = process.env.NODE_ENV === "production";

async function main() {
  const repo = await createRepo();
  const live = new LiveCrowd(repo);
  await live.init();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use("/api", apiRouter(repo, live));

  const clientDir = path.resolve(__dirname, "../dist/client");
  if (isProd && fs.existsSync(clientDir)) {
    app.use(express.static(clientDir, { maxAge: "1h", index: false }));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDir, "index.html")));
  }

  app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    void _next;
    if (err instanceof ZodError) return res.status(400).json({ error: "Invalid request", issues: err.issues });
    console.error(err);
    res.status(500).json({ error: (err as Error).message ?? "Internal error" });
  });

  app.listen(PORT, "0.0.0.0", () => console.log(`[routesetu] API listening on http://localhost:${PORT} (${repo.kind})`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
