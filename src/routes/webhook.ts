import type { FastifyInstance, FastifyRequest } from "fastify";
import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";

interface WebhookRequest extends FastifyRequest {
  rawBody?: string;
}

function verifySignature(rawBody: string, signature: string | undefined): boolean {
  if (!signature) return false;

  const expected =
    "sha256=" +
    createHmac("sha256", config.github.webhookSecret)
      .update(rawBody)
      .digest("hex");

  // timingSafeEqual prevents timing attacks, but requires equal-length buffers
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length) return false;

  return timingSafeEqual(expectedBuf, actualBuf);
}

export async function webhookRoutes(app: FastifyInstance) {
  app.post("/webhook", async (request: WebhookRequest, reply) => {
    const signature = request.headers["x-hub-signature-256"] as string | undefined;
    const rawBody = request.rawBody ?? "";

    if (!verifySignature(rawBody, signature)) {
      app.log.warn("Invalid webhook signature");
      return reply.status(401).send({ error: "Invalid signature" });
    }

    const event = request.headers["x-github-event"];
    app.log.info({ event }, "Verified webhook received");

    return reply.send({ received: true });
  });
}