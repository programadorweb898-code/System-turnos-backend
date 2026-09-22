import express from "express";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok"
  });
});

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`Backend ejecutándose en el puerto ${port}`);
});
