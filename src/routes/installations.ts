import type { FastifyInstance } from "fastify";
import { prisma } from "../db/client.js";
import { getInstallationOctokit } from "../github/client.js";

interface CreateInstallationBody {
  clerkUserId: string;
  installationId: number;
}

export async function installationRoutes(app: FastifyInstance) {
  app.post<{ Body: CreateInstallationBody }>(
    "/api/installations",
    async (request, reply) => {
      const { clerkUserId, installationId } = request.body;

      if (!clerkUserId || !installationId) {
        return reply.status(400).send({ error: "Missing required fields" });
      }

      const octokit = await getInstallationOctokit(installationId);
      const { data: installationDetails } = await octokit.rest.apps.getInstallation({
        installation_id: installationId,
      });

      const githubLogin =
        (installationDetails.account as { login?: string })?.login ?? "unknown";

      const installation = await prisma.installation.upsert({
        where: { clerkUserId },
        update: { installationId, githubLogin },
        create: { clerkUserId, installationId, githubLogin },
      });

      return reply.send({ installation });
    },
  );
}