import "dotenv/config";
import { readFileSync } from "node:fs";

function loadPrivateKey(path: string): string {
  return readFileSync(path, "utf-8");
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  github: {
    appId: process.env.GITHUB_APP_ID ?? "",
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY_PATH
      ? loadPrivateKey(process.env.GITHUB_APP_PRIVATE_KEY_PATH)
      : "",
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET ?? "",
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY ?? "",
  },
};