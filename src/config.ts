import "dotenv/config";

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  github: {
    // These will throw at startup if missing — better to fail fast
    // than to silently accept unverifiable webhooks later.
    appId: process.env.GITHUB_APP_ID ?? "",
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY ?? "",
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET ?? "",
  },
};