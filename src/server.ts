import Fastify from "fastify";
import { config } from "./config.js";
import { webhookRoutes } from "./routes/webhook.js";

const app = Fastify({ logger: true });

// Capture raw body ONLY for the webhook route's content type,
// so signature verification has the untouched payload to hash.
app.addContentTypeParser(
  "application/json",
  { parseAs: "string" },
  (req, body, done) => {
    // Stash the raw string on the request for later verification,
    // then parse it normally so route handlers still get JSON.
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

app.listen({ port: config.port }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Revyn server listening at ${address}`);
});