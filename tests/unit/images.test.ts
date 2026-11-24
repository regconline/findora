import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { processImage, ImageValidationError } from "@/lib/images";

const file = async (buf: Buffer, name = "x.png", type = "image/png") => new File([new Uint8Array(buf)], name, { type });

describe("image processing", () => {
  it("re-encodes valid images to WebP and resizes them", async () => {
    const png = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#20B88A" } }).png().toBuffer();
    const out = await processImage(await file(png), "gallery");
    expect(out.contentType).toBe("image/webp");
    expect(out.width).toBeLessThanOrEqual(1600);
    expect((await sharp(out.buffer).metadata()).format).toBe("webp");
    expect(out.filename).toMatch(/^[0-9a-f-]{36}\.webp$/);
  });
  it("rejects files that are not images even with an image MIME type", async () => {
    await expect(processImage(await file(Buffer.from("<script>alert(1)</script>"), "evil.png"), "logo")).rejects.toBeInstanceOf(ImageValidationError);
  });
  it("rejects disallowed formats (e.g. GIF)", async () => {
    const gif = await sharp({ create: { width: 200, height: 200, channels: 3, background: "#000" } }).gif().toBuffer();
    await expect(processImage(await file(gif, "a.gif", "image/gif"), "logo")).rejects.toThrow(/JPG, PNG and WebP/);
  });
  it("rejects tiny and empty images", async () => {
    const tiny = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#000" } }).png().toBuffer();
    await expect(processImage(await file(tiny), "logo")).rejects.toThrow(/too small/);
    await expect(processImage(await file(Buffer.alloc(0)), "logo")).rejects.toThrow();
  });
  it("strips EXIF/GPS metadata", async () => {
    const jpg = await sharp({ create: { width: 400, height: 300, channels: 3, background: "#fff" } }).jpeg().withExif({ IFD0: { Artist: "secret" } }).toBuffer();
    const out = await processImage(await file(jpg, "a.jpg", "image/jpeg"), "gallery");
    expect((await sharp(out.buffer).metadata()).exif).toBeUndefined();
  });
});
