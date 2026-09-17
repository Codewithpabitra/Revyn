import { Queue } from "bullmq";
import { redisConnection } from "./connection.js";

export interface ReviewJobData {
  installationId: number;
  owner: string;
  repo: string;
  pullNumber: number;
  headSha: string;
}

export const reviewQueue = new Queue<ReviewJobData>("pr-review", {
  connection: redisConnection,
});