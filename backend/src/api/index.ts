import { createApp } from "./app";
import { env } from "../shared/env";
import { prisma } from "../shared/prisma";

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`API is running on port ${env.PORT}`);
});

const shutdown = async () => {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
