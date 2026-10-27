import { readdir } from "node:fs/promises";
import path from "node:path";

const audioExtensions = new Set([".aac", ".m4a", ".mp3", ".oga", ".ogg", ".wav", ".weba", ".webm"]);

export async function GET() {
  const musicDirectory = path.join(process.cwd(), "public", "music");
  const entries = await readdir(musicDirectory, { withFileTypes: true });
  const tracks = entries
    .filter((entry) => entry.isFile() && audioExtensions.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => ({
      title: path.basename(entry.name, path.extname(entry.name)).replace(/[_]+/g, " ").trim(),
      src: `/music/${encodeURIComponent(entry.name)}`,
    }))
    .sort((first, second) => first.title.localeCompare(second.title, undefined, { sensitivity: "base" }));

  return Response.json(tracks);
}
