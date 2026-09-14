import type { FastifyInstance } from "fastify";

export async function webhookRoutes(app: FastifyInstance) {
  app.post("/webhook", async (request, reply) => {
    app.log.info({ body: request.body }, "Received webhook");
    return reply.send({ received: true });
  });
}