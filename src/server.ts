import Fastify from "fastify";
import { config } from "./config.js";
import cors from "@fastify/cors";
import { webhookRoutes } from "./routes/webhook.js";
import { installationRoutes } from "./routes/installations.js";
import { reviewRoutes } from "./routes/reviews.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: ["http://localhost:3000"],
});

app.addContentTypeParser(
  "application/json",
  { parseAs: "string" },
  (req, body, done) => {
    (req as any).rawBody = body;

    try {
      const json = JSON.parse(body as string);
      done(null, json);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
);

app.get("/health", async () => ({ status: "ok" }));

app.register(webhookRoutes);
app.register(installationRoutes);
app.register(reviewRoutes);

app.listen(
  {
    port: config.port,
    host: "0.0.0.0",
  },
  (err, address) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }

    app.log.info(`Revyn server listening at ${address}`);
  }
);