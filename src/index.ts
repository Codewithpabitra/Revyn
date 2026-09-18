import { spawn } from "node:child_process";

const server = spawn("node", ["dist/server.js"], {
  stdio: "inherit",
});

const worker = spawn("node", ["dist/queue/reviewWorker.js"], {
  stdio: "inherit",
});

const shutdown = (signal: string) => {
  console.log(`Received ${signal}. Shutting down...`);

  server.kill("SIGTERM");
  worker.kill("SIGTERM");
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

server.on("exit", (code) => {
  console.log(`Server exited with code ${code}`);
  worker.kill("SIGTERM");
  process.exit(code ?? 1);
});

worker.on("exit", (code) => {
  console.log(`Worker exited with code ${code}`);
  server.kill("SIGTERM");
  process.exit(code ?? 1);
});