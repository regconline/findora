import { describe, expect, it } from "vitest";
import { formatPrice, normaliseSaPhone, normaliseUrl, pageRange, safeNext, slugify, whatsappLink, plainText } from "@/lib/utils";

describe("utilities", () => {
  it("slugifies business names for SEO-friendly URLs", () => {
    expect(slugify("Bob's Plumbing & Gas — Klerksdorp")).toBe("bob-s-plumbing-and-gas-klerksdorp");
    expect(slugify("Café Façade")).toBe("cafe-facade");
  });
  it("normalises SA phone numbers", () => {
    expect(normaliseSaPhone("082 123 4567")).toBe("+27821234567");
    expect(normaliseSaPhone("+27 (18) 123-4567")).toBe("+27181234567");
    expect(normaliseSaPhone("12345")).toBeNull();
    expect(whatsappLink("+27821234567", "Hi")).toBe("https://wa.me/27821234567?text=Hi");
  });
  it("only accepts http(s) URLs", () => {
    expect(normaliseUrl("example.co.za")).toBe("https://example.co.za/");
    expect(normaliseUrl("javascript:alert(1)")).toBeNull();
    expect(normaliseUrl("not a url")).toBeNull();
  });
  it("formats prices by price type", () => {
    expect(formatPrice(450, "fixed")).toMatch(/R\s?450/);
    expect(formatPrice(300, "hourly")).toMatch(/\/ hour/);
    expect(formatPrice(null, "quote")).toBe("Quotation required");
    expect(formatPrice(0, "free")).toBe("Free");
  });
  it("prevents open redirects", () => {
    expect(safeNext("/dashboard/saved")).toBe("/dashboard/saved");
    expect(safeNext("//evil.com")).toBe("/dashboard");
    expect(safeNext("https://evil.com")).toBe("/dashboard");
    expect(safeNext("/\\evil.com")).toBe("/dashboard");
  });
  it("builds compact pagination ranges", () => {
    expect(pageRange(1, 3)).toEqual([1, 2, 3]);
    expect(pageRange(10, 20)).toEqual([1, "…", 9, 10, 11, "…", 20]);
  });
  it("strips markdown for meta descriptions", () => {
    expect(plainText("## Hello **world** [link](/x)", 50)).toBe("Hello world link");
  });
});
