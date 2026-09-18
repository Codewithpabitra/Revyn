import { Worker } from "bullmq";
import { redisConnection } from "./connection.js";
import { getInstallationOctokit } from "../github/client.js";
import { reviewFileDiff, type FileReviewResult } from "../ai/groq.js";
import { postReviewToGitHub } from "../github/review.js";
import type { ReviewJobData } from "./reviewQueue.js";
import { shouldReviewFile } from "../utils/fileFilters.js";
import { prisma } from "../db/client.js";


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

    // Fetch PR title for the record — listFiles doesn't include it
    const { data: pr } = await octokit.rest.pulls.get({ owner, repo, pull_number: pullNumber });

    const reviews: Array<{ filename: string; result: FileReviewResult }> = [];

    for (const file of files) {
      if (!shouldReviewFile(file.filename, file.patch)) continue;
      try {
        const result = await reviewFileDiff({ filename: file.filename, patch: file.patch! });
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

      // Persist a record so the dashboard has something to show
      const installationRecord = await prisma.installation.findUnique({
        where: { installationId },
      });

      if (installationRecord) {
        const totalIssues = reviews.reduce((sum, r) => sum + r.result.issues.length, 0);
        const combinedSummary = reviews.map((r) => `${r.filename}: ${r.result.summary}`).join(" | ");

        await prisma.review.create({
          data: {
            installationId: installationRecord.id,
            repoFullName: `${owner}/${repo}`,
            prNumber: pullNumber,
            prTitle: pr.title,
            headSha,
            summary: combinedSummary,
            issuesFound: totalIssues,
          },
        });
      } else {
        console.warn(`No Installation record found for installationId ${installationId} — skipping DB write`);
      }
    }

    return { reviewedFiles: reviews.length };
  },
  { connection: redisConnection }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed:`, job.returnvalue);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

console.log("Review worker started, waiting for jobs...");
