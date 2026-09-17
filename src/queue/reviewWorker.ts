import { Worker } from "bullmq";
import { redisConnection } from "./connection.js";
import { getInstallationOctokit } from "../github/client.js";
import { reviewFileDiff, type FileReviewResult } from "../ai/groq.js";
import { postReviewToGitHub } from "../github/review.js";
import type { ReviewJobData } from "./reviewQueue.js";
import { shouldReviewFile } from "../utils/fileFilters.js";

const worker = new Worker<ReviewJobData>(
  "pr-review",
  async (job) => {
    const { installationId, owner, repo, pullNumber, headSha } = job.data;

    const octokit = await getInstallationOctokit(installationId);
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
    });

    const reviews: Array<{ filename: string; result: FileReviewResult }> = [];

    for (const file of files) {
      if (!shouldReviewFile(file.filename, file.patch)) {
        console.log(`Skipping ${file.filename} (filtered or too large)`);
        continue;
      }
      try {
        const result = await reviewFileDiff({
          filename: file.filename,
          patch: file.patch!,
        });
        reviews.push({ filename: file.filename, result });
      } catch (err) {
        console.error(`Review failed for ${file.filename}`, err);
      }
    }

    if (reviews.length > 0) {
      await postReviewToGitHub({
        octokit,
        owner,
        repo,
        pullNumber,
        commitId: headSha,
        reviews,
      });
    }

    return { reviewedFiles: reviews.length };
  },
  { connection: redisConnection },
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed:`, job.returnvalue);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

console.log("Review worker started, waiting for jobs...");
