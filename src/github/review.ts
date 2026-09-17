import type { Octokit } from "octokit";
import type { FileReviewResult } from "../ai/groq.js";

interface PostReviewParams {
  octokit: Octokit;
  owner: string;
  repo: string;
  pullNumber: number;
  commitId: string; // head SHA — required by createReview to anchor line comments
  reviews: Array<{ filename: string; result: FileReviewResult }>;
}

export async function postReviewToGitHub(params: PostReviewParams) {
  const { octokit, owner, repo, pullNumber, commitId, reviews } = params;

  const comments = reviews.flatMap(({ filename, result }) =>
    result.issues.map((issue) => ({
      path: filename,
      line: issue.line,
      side: "RIGHT" as const, // comment on the new version of the file, not the old
      body: `**${issue.severity.toUpperCase()}**: ${issue.comment}`,
    }))
  );

  const summaryBody = buildSummaryBody(reviews);

  // If there are no line-specific issues, skip inline comments and just post the summary
  // (createReview requires COMMENT/APPROVE/REQUEST_CHANGES event when comments[] is empty
  // — COMMENT is safe and won't block merging).
  await octokit.rest.pulls.createReview({
    owner,
    repo,
    pull_number: pullNumber,
    commit_id: commitId,
    event: "COMMENT",
    body: summaryBody,
    comments: comments.length > 0 ? comments : undefined,
  });
}

function buildSummaryBody(reviews: Array<{ filename: string; result: FileReviewResult }>): string {
  const header = "## 🤖 Revyn AI Review\n";
  const fileSummaries = reviews
    .map(({ filename, result }) => `**\`${filename}\`**: ${result.summary}`)
    .join("\n\n");

  const totalIssues = reviews.reduce((sum, r) => sum + r.result.issues.length, 0);
  const issueLine =
    totalIssues > 0
      ? `\n\n Found **${totalIssues}** item(s) to review — see inline comments below.`
      : "\n\n No issues found. Looks good!";

  return `${header}\n${fileSummaries}${issueLine}`;
}