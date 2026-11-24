// Crawls a running Findora instance and reports broken internal links and assets.
// Usage: node scripts/check-links.mjs http://localhost:3000
const BASE = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const MAX = Number(process.env.MAX_PAGES || 800);
const seen = new Map(); // url -> status
const from = new Map(); // url -> first referrer
const queue = ["/", "/sitemap.xml", "/robots.txt", "/manifest.webmanifest", "/blog/rss.xml"];
const isPage = (p) => !/\.(png|webp|jpg|jpeg|svg|ico|xml|txt|webmanifest|js|css|woff2)(\?|$)/.test(p);

async function check(path) {
  const res = await fetch(BASE + path, { redirect: "manual", headers: { "user-agent": "findora-link-checker" } });
  const status = res.status;
  let body = "";
  const type = res.headers.get("content-type") || "";
  if (status === 200 && (type.includes("html") || type.includes("xml"))) body = await res.text();
  else await res.arrayBuffer().catch(() => {});
  return { status, body, location: res.headers.get("location") };
}

function extract(html, base) {
  const out = new Set();
  const re = /(?:href|src)=["']([^"'#]+)["']|<loc>([^<]+)<\/loc>|srcSet=["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(html))) {
    let u = m[1] || m[2] || (m[3] ? m[3].split(",")[0].trim().split(" ")[0] : "");
    if (!u) continue;
    u = u.replace(/&amp;/g, "&");
    if (u.startsWith("http")) {
      try {
        const x = new URL(u);
        if (!/localhost|findora/.test(x.hostname)) continue;
        u = x.pathname + x.search;
      } catch { continue; }
    }
    if (!u.startsWith("/") || u.startsWith("//") || u.startsWith("/_next/static") || u.startsWith("/cdn-cgi")) continue;
    out.add(u);
  }
  return out;
}

while (queue.length && seen.size < MAX) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  let r;
  try { r = await check(path); } catch (e) { seen.set(path, "ERR " + e.message); continue; }
  seen.set(path, r.status);
  if (r.status >= 300 && r.status < 400 && r.location) {
    const loc = r.location.startsWith("http") ? new URL(r.location).pathname + new URL(r.location).search : r.location;
    if (!seen.has(loc)) { queue.push(loc); from.set(loc, path); }
  }
  if (r.body) for (const u of extract(r.body)) {
    // don't explode on filter/query combinations: follow only first page variants of search params
    if (/[?&](page|min|max|weekends|type|sort)=/.test(u) && !u.startsWith("/_next/image")) continue;
    if (!seen.has(u) && !queue.includes(u)) { queue.push(u); if (!from.has(u)) from.set(u, path); }
  }
}

const bad = [...seen].filter(([, s]) => !(typeof s === "number" && (s < 400)));
const pages = [...seen.keys()].filter(isPage).length;
console.log(`Checked ${seen.size} URLs (${pages} pages/routes, ${seen.size - pages} assets).`);
const byStatus = {};
for (const [, s] of seen) byStatus[s] = (byStatus[s] || 0) + 1;
console.log("Status counts:", JSON.stringify(byStatus));
if (bad.length) {
  console.log(`\n${bad.length} broken:`);
  for (const [u, s] of bad) console.log(`  ${s}  ${u}   (linked from ${from.get(u) ?? "start"})`);
  process.exitCode = 1;
} else console.log("No broken links.");
