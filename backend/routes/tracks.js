import { Router } from "express";
import { readFileSync, createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";

const router = Router();
const dataDir = path.join(import.meta.dirname, "../data");
const songsPath = path.join(dataDir, "songs.json");

const songs = JSON.parse(readFileSync(songsPath, "utf-8"));

router.get("/", (req, res) => {
  const withStreamUrls = songs.map((song) => ({
    ...song,
    src: `/api/tracks/${song.id}/stream`,
  }));
  res.json(withStreamUrls);
});

router.get("/:id/stream", async (req, res) => {
  const song = songs.find((s) => s.id === req.params.id);
  if (!song) return res.status(404).json({ error: "Track not found" });

  const filePath = path.join(dataDir, "audio", song.file);

  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch (err) {
    console.error(`Arquivo de áudio não encontrado: ${filePath}`, err.message);
    return res.status(404).json({ error: "Audio file not found" });
  }

  const fileSize = fileStat.size;
  const range = req.headers.range;

  if (!range) {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "audio/mpeg",
    });
    createReadStream(filePath).pipe(res);
    return;
  }

  const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
  const start = parseInt(startStr, 10);
  const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
  const chunkSize = end - start + 1;

  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": chunkSize,
    "Content-Type": "audio/mpeg",
  });
  createReadStream(filePath, { start, end }).pipe(res);
});

export default router;
