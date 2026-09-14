import Fastify from "fastify";
import { config } from "./config.js";
import { webhookRoutes } from "./routes/webhook.js";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ status: "ok" }));

app.register(webhookRoutes);

app.listen({ port: config.port }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Revyn server listening at ${address}`);
});