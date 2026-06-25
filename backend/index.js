import express from "express";
import cors from "cors";
import tracksRouter from "./routes/tracks.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use("/api/tracks", tracksRouter);

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
