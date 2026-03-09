import express from "express";
import cors from "cors";
import https from "https";
import fs from "fs";
import path from "path";
import agentRoutes from "./routes/agent";
import auditRoutes from "./routes/audit";
import translateRoutes from "./routes/translate";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: [
      "https://localhost:3000",
      "http://localhost:3000",
      "null",
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));

app.use("/agent", agentRoutes);
app.use("/agent", auditRoutes);
app.use("/agent", translateRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const certDir = path.join(
  process.env.HOME || "~",
  ".office-addin-dev-certs"
);
const certPath = path.join(certDir, "localhost.crt");
const keyPath = path.join(certDir, "localhost.key");

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const httpsServer = https.createServer(
    {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    },
    app
  );
  httpsServer.listen(PORT, () => {
    console.log(`Incenta server running on https://localhost:${PORT}`);
  });
} else {
  console.warn(
    "No dev certs found, falling back to HTTP. Run the addin dev server first to generate certs."
  );
  app.listen(PORT, () => {
    console.log(`Incenta server running on http://localhost:${PORT}`);
  });
}

export default app;
