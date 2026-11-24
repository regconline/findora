// Generates branded article cover images (1600×900 WebP) into public/blog/covers.
// Run: node scripts/gen-covers.mjs   (requires dev deps: sharp, lucide-static)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ICONS = path.join(ROOT, "node_modules/lucide-static/icons");
const OUT = path.join(ROOT, "public/blog/covers");
fs.mkdirSync(OUT, { recursive: true });

// slug → [main icon, accent icons, palette]
const MAP = {
  "how-to-choose-a-reliable-service-provider": ["badge-check", ["search", "wrench"], "navy"],
  "starting-a-small-business-in-south-africa": ["rocket", ["store", "file-text"], "emerald"],
  "low-cost-marketing-ideas-for-small-businesses": ["megaphone", ["heart", "share-2"], "teal"],
  "why-local-business-discovery-matters": ["map-pin", ["store", "users"], "mint"],
  "building-your-digital-visibility": ["globe", ["search", "trending-up"], "navy"],
  "customer-communication-tips": ["message-circle", ["phone", "mail"], "emerald"],
  "choosing-professional-services": ["scale", ["briefcase", "landmark"], "teal"],
  "technology-tools-for-small-businesses": ["laptop", ["smartphone", "cloud"], "mint"],
  "optimise-your-business-profile": ["store", ["image", "sparkles"], "navy"],
  "building-customer-trust": ["handshake", ["shield-check", "star"], "emerald"],
  "supporting-local-economic-development": ["landmark", ["trending-up", "users"], "teal"],
  "how-to-avoid-service-scams": ["shield-check", ["lock", "triangle-alert"], "navy"],
  "google-business-profile-guide": ["map-pinned", ["search", "star"], "mint"],
  "whatsapp-business-guide": ["message-circle-more", ["smartphone", "tags"], "emerald"],
  "how-to-price-your-services": ["calculator", ["tags", "coins"], "teal"],
  "hiring-a-builder-or-contractor": ["hard-hat", ["ruler", "house"], "navy"],
  "finding-a-healthcare-practice": ["stethoscope", ["heart-pulse", "calendar-check"], "mint"],
  "better-business-photos-with-your-phone": ["camera", ["image", "sun"], "emerald"],
  "popia-for-small-businesses": ["lock", ["file-text", "shield-check"], "teal"],
  "keeping-your-business-running-during-outages": ["zap", ["battery-charging", "wifi"], "navy"],
};

const PALETTES = {
  navy: { bg: "#102C3B", bg2: "#17394B", fg: "#FFFFFF", accent: "#20B88A", soft: "#FFFFFF", logo: "dark" },
  emerald: { bg: "#0E5A45", bg2: "#127055", fg: "#FFFFFF", accent: "#F2A93B", soft: "#FFFFFF", logo: "dark" },
  teal: { bg: "#123F4F", bg2: "#18505F", fg: "#FFFFFF", accent: "#20B88A", soft: "#FFFFFF", logo: "dark" },
  mint: { bg: "#E6F5EF", bg2: "#D3EEE3", fg: "#102C3B", accent: "#20B88A", soft: "#102C3B", logo: "light" },
};

function iconInner(name) {
  const file = path.join(ICONS, `${name}.svg`);
  if (!fs.existsSync(file)) throw new Error(`Missing icon ${name}`);
  const svg = fs.readFileSync(file, "utf8");
  return svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
}

function categoryLabel(slug) {
  const md = fs.readdirSync(path.join(ROOT, "content/articles")).map((f) => fs.readFileSync(path.join(ROOT, "content/articles", f), "utf8")).find((t) => t.includes(`slug: ${slug}\n`));
  const cat = md?.match(/category: (.+)/)?.[1] ?? "";
  return { "finding-services": "Finding Services", "business-growth": "Business Growth", "starting-a-business": "Starting a Business", "business-technology": "Business Technology", "local-economy": "Local Economy" }[cat] ?? "Findora Guides";
}

function svgFor(slug, [main, accents, paletteName]) {
  const p = PALETTES[paletteName];
  const W = 1600, H = 900;
  const dots = [];
  for (let y = 40; y < H; y += 36) for (let x = 40; x < W; x += 36) dots.push(`<circle cx="${x}" cy="${y}" r="1.6"/>`);
  const label = categoryLabel(slug);
  const labelW = 40 + label.length * 15;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${p.bg}"/>
  <g fill="${p.soft}" opacity="0.07">${dots.join("")}</g>
  <circle cx="1180" cy="450" r="520" fill="${p.bg2}"/>
  <circle cx="1180" cy="450" r="380" fill="none" stroke="${p.soft}" stroke-opacity="0.10" stroke-width="2"/>
  <circle cx="1180" cy="450" r="250" fill="none" stroke="${p.accent}" stroke-opacity="0.35" stroke-width="3" stroke-dasharray="6 14"/>
  <rect x="1010" y="280" width="340" height="340" rx="72" fill="${p.accent}"/>
  <g transform="translate(1060 330) scale(10)" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${iconInner(main)}</g>
  <g transform="translate(1440 150)"><rect width="120" height="120" rx="30" fill="${p.soft}" fill-opacity="0.10"/><g transform="translate(30 30) scale(2.5)" fill="none" stroke="${p.fg}" stroke-opacity="0.85" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconInner(accents[0])}</g></g>
  <g transform="translate(840 650)"><rect width="110" height="110" rx="28" fill="${p.soft}" fill-opacity="0.10"/><g transform="translate(27 27) scale(2.33)" fill="none" stroke="${p.fg}" stroke-opacity="0.85" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconInner(accents[1])}</g></g>
  <g transform="translate(110 640)">
    <rect width="${labelW}" height="56" rx="28" fill="${p.accent}" fill-opacity="${paletteName === "mint" ? 1 : 0.95}"/>
    <text x="${labelW / 2}" y="37" text-anchor="middle" font-family="Inter, DejaVu Sans, sans-serif" font-size="24" font-weight="600" fill="#FFFFFF">${label}</text>
  </g>
  <rect x="110" y="300" width="560" height="22" rx="11" fill="${p.soft}" fill-opacity="0.14"/>
  <rect x="110" y="345" width="460" height="22" rx="11" fill="${p.soft}" fill-opacity="0.10"/>
  <rect x="110" y="390" width="380" height="22" rx="11" fill="${p.soft}" fill-opacity="0.08"/>
  <rect x="110" y="455" width="190" height="54" rx="14" fill="${p.accent}" fill-opacity="0.9"/>
  ${paletteName === "emerald" ? `<rect x="90" y="92" width="340" height="128" rx="22" fill="#062a20" fill-opacity="0.55"/>` : ""}
  <rect x="${W - 12}" y="0" width="12" height="${H}" fill="${p.accent}"/>
</svg>`;
}

const logoLight = await sharp(path.join(ROOT, "public/brand/findora-logo.png")).resize({ width: 300 }).png().toBuffer();
const logoDark = await sharp(path.join(ROOT, "public/brand/findora-logo-dark.png")).resize({ width: 300 }).png().toBuffer();

for (const [slug, spec] of Object.entries(MAP)) {
  const p = PALETTES[spec[2]];
  const out = path.join(OUT, `${slug}.webp`);
  await sharp(Buffer.from(svgFor(slug, spec)))
    .composite([{ input: p.logo === "dark" ? logoDark : logoLight, top: 110, left: 110 }])
    .webp({ quality: 82 })
    .toFile(out);
  console.log("✓", path.relative(ROOT, out));
}
