import express from "express";

export const createApp = () => {
  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok"
    });
  });

  return app;
};
