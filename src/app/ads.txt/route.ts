// ads.txt for Google AdSense. Served only once a publisher ID is configured.
// NEXT_PUBLIC_ADSENSE_CLIENT_ID looks like "ca-pub-1234567890123456".
export const dynamic = "force-static";

export function GET() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? "";
  const pub = client.replace(/^ca-/, "");
  if (!/^pub-\d{10,20}$/.test(pub)) return new Response("# ads.txt not configured\n", { status: 404, headers: { "Content-Type": "text/plain" } });
  return new Response(`google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`, { headers: { "Content-Type": "text/plain", "Cache-Control": "public, max-age=86400" } });
}
