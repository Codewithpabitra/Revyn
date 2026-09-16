import type { FastifyInstance, FastifyRequest } from "fastify";
import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";
import { getInstallationOctokit } from "../github/client.js";

import { reviewFileDiff } from "../ai/groq.js";

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

      // Reply to GitHub immediately — don't make GitHub wait on our diff fetch + AI call.
      // (We'll move this to a proper queue in Phase 5; for now, fire-and-forget is fine to test.)
      reply.send({ received: true });

      const octokit = await getInstallationOctokit(installation.id);

      const { data: files } = await octokit.rest.pulls.listFiles({
        owner: repository.owner.login,
        repo: repository.name,
        pull_number: number,
      });

      app.log.info(
        { prNumber: number, fileCount: files.length },
        "Fetched changed files",
      );

      const reviews: Array<{
        filename: string;
        result: Awaited<ReturnType<typeof reviewFileDiff>>;
      }> = [];

      for (const file of files) {
        if (!file.patch) {
          app.log.info(
            { filename: file.filename },
            "Skipping file with no patch (binary or too large)",
          );
          continue;
        }

        try {
          const result = await reviewFileDiff({
            filename: file.filename,
            patch: file.patch,
          });
          reviews.push({ filename: file.filename, result });
          app.log.info(
            { filename: file.filename, result },
            "AI review complete",
          );
        } catch (err) {
          app.log.error({ filename: file.filename, err }, "AI review failed");
        }
      }

      return;
    }

    return reply.send({ received: true });
  });
}
