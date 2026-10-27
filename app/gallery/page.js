import { readdir } from "node:fs/promises";
import path from "node:path";
import GalleryClient from "./GalleryClient";

const imageExtensions = new Set([".avif", ".bmp", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const videoExtensions = new Set([".m4v", ".mov", ".mp4", ".ogv", ".webm"]);

async function findPublicImages(directory, relativeDirectory = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const images = await Promise.all(entries.map(async (entry) => {
    const relativePath = path.join(relativeDirectory, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findPublicImages(absolutePath, relativePath);
    if (!entry.isFile()) return [];
    const extension = path.extname(entry.name).toLowerCase();
    const type = imageExtensions.has(extension) ? "image" : videoExtensions.has(extension) ? "video" : null;
    if (!type) return [];
    const url = `/${relativePath.split(path.sep).map(encodeURIComponent).join("/")}`;
    return [{ src: url, name: path.basename(entry.name, extension), type }];
  }));
  return images.flat();
}

export default async function GalleryPage() {
  const publicDirectory = path.join(process.cwd(), "public");
  const images = (await findPublicImages(publicDirectory)).sort((first, second) =>
    first.name.localeCompare(second.name, undefined, { numeric: true, sensitivity: "base" })
  );

  return <GalleryClient images={images} />;
}
