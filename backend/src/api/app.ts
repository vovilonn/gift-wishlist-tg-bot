import cors from "cors";
import express from "express";

import { env } from "../shared/env";
import { errorHandler, registerRoutes } from "./routes";

export const createApp = (): express.Express => {
  const app = express();
  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));

  registerRoutes(app);
  app.use(errorHandler);

  return app;
};
