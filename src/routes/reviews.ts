import type { FastifyInstance } from "fastify";
import { prisma } from "../db/client.js";

export async function reviewRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { clerkUserId: string } }>(
    "/api/reviews",
    async (request, reply) => {
      const { clerkUserId } = request.query;

      if (!clerkUserId) {
        return reply.status(400).send({ error: "Missing clerkUserId" });
      }

      const installation = await prisma.installation.findUnique({
        where: { clerkUserId },
        include: {
          reviews: {
            orderBy: { createdAt: "desc" },
            take: 50,
          },
        },
      });

      if (!installation) {
        return reply.send({ reviews: [] });
      }

      return reply.send({ reviews: installation.reviews });
    },
  );
}
