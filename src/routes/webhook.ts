import type { FastifyInstance, FastifyRequest } from "fastify";
import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";

import { reviewQueue } from "../queue/reviewQueue.js";

interface WebhookRequest extends FastifyRequest {
  rawBody?: string;
}

function verifySignature(
  rawBody: string,
  signature: string | undefined,
): boolean {
  if (!signature) return false;
  const expected =
    "sha256=" +
    createHmac("sha256", config.github.webhookSecret)
      .update(rawBody)
      .digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

export async function webhookRoutes(app: FastifyInstance) {
  app.post("/webhook", async (request: WebhookRequest, reply) => {
    const signature = request.headers["x-hub-signature-256"] as
      | string
      | undefined;
    const rawBody = request.rawBody ?? "";

    if (!verifySignature(rawBody, signature)) {
      app.log.warn("Invalid webhook signature");
      return reply.status(401).send({ error: "Invalid signature" });
    }

    const event = request.headers["x-github-event"];
    const payload = request.body as any;

    app.log.info(
      { event, action: payload?.action },
      "Verified webhook received",
    );

    if (
      event === "pull_request" &&
      ["opened", "synchronize", "reopened"].includes(payload?.action)
    ) {
      const { number, pull_request, repository, installation } = payload;

      await reviewQueue.add("review-pr", {
        installationId: installation.id,
        owner: repository.owner.login,
        repo: repository.name,
        pullNumber: number,
        headSha: pull_request.head.sha,
      });

      app.log.info({ prNumber: number }, "Enqueued PR for review");
      return reply.send({ received: true });
    }

    return reply.send({ received: true });
  });
}
