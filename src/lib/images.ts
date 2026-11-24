import "server-only";
import sharp, { type Metadata } from "sharp";
import { randomUUID } from "node:crypto";
import { LIMITS } from "@/lib/constants";

export type ImagePreset = "logo" | "cover" | "gallery" | "service" | "avatar" | "article";

const PRESETS: Record<ImagePreset, { width: number; height?: number; fit: "inside" | "cover" }> = {
  logo: { width: 512, height: 512, fit: "inside" },
  avatar: { width: 400, height: 400, fit: "cover" },
  cover: { width: 1920, height: 1080, fit: "inside" },
  gallery: { width: 1600, height: 1600, fit: "inside" },
  service: { width: 1200, height: 1200, fit: "inside" },
  article: { width: 1600, height: 1200, fit: "inside" },
};

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

export class ImageValidationError extends Error {}

/**
 * Validates by decoding the actual bytes (not the client-supplied MIME type),
 * strips metadata (EXIF/GPS), auto-rotates, resizes and re-encodes to WebP.
 */
export async function processImage(file: File, preset: ImagePreset) {
  if (!(file instanceof File) || file.size === 0) throw new ImageValidationError("Choose an image to upload.");
  if (file.size > LIMITS.maxUploadBytes) throw new ImageValidationError("Images must be 4 MB or smaller.");

  const input = Buffer.from(await file.arrayBuffer());
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 40_000_000 }).metadata();
  } catch {
    throw new ImageValidationError("This file is not a valid image.");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new ImageValidationError("Only JPG, PNG and WebP images are allowed.");
  }
  if ((meta.width ?? 0) < 64 || (meta.height ?? 0) < 64) throw new ImageValidationError("Image is too small (minimum 64×64 pixels).");

  const p = PRESETS[preset];
  const { data, info } = await sharp(input, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width: p.width, height: p.height, fit: p.fit, withoutEnlargement: true })
    .webp({ quality: preset === "logo" ? 90 : 80, effort: 4 })
    .toBuffer({ resolveWithObject: true });

  return { buffer: data, width: info.width, height: info.height, contentType: "image/webp", filename: `${randomUUID()}.webp` };
}
