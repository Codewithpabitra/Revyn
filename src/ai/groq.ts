import Groq from "groq-sdk";
import { config } from "../config.js";

const groq = new Groq({ apiKey: config.groq.apiKey });

// Keeping this as a named export function (not just the raw client) so that
// swapping to OpenAI/Claude later only means changing this one file.
export async function reviewFileDiff(params: {
  filename: string;
  patch: string;
}): Promise<FileReviewResult> {
  const { filename, patch } = params;

  const systemPrompt = `You are a senior software engineer performing a pull request code review.
You will be given a single file's diff (unified patch format).
Review ONLY the lines that were added or changed (lines starting with "+").
Identify real bugs, logic errors, security issues, and meaningful improvements — skip nitpicks about style unless they're actually harmful.
Respond ONLY with valid JSON, no markdown fences, no preamble, matching this exact shape:
{
  "summary": "one or two sentence summary of what changed in this file",
  "issues": [
    {
      "line": <number, the new-file line number this issue applies to>,
      "severity": "bug" | "suggestion" | "nit",
      "comment": "concise explanation of the issue and suggested fix"
    }
  ]
}
If there are no issues, return an empty "issues" array.`;

  const userPrompt = `File: ${filename}\n\nDiff:\n${patch}`;

  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw) as FileReviewResult;
}

export interface FileReviewResult {
  summary: string;
  issues: Array<{
    line: number;
    severity: "bug" | "suggestion" | "nit";
    comment: string;
  }>;
}
