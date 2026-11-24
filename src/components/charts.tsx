import { cn } from "@/lib/utils";

type Point = { day: string; value: number };

/**
 * Server-rendered SVG column chart (zero client JS). Includes a visually hidden
 * data table for screen readers.
 */
export function ColumnChart({ title, data, color = "#20B88A", className }: { title: string; data: Point[]; color?: string; className?: string }) {
  const W = 640, H = 180, P = { l: 32, r: 8, t: 12, b: 24 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = max <= 4 ? 4 : Math.ceil(max / 4) * 4;
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  const bw = iw / Math.max(1, data.length);
  const total = data.reduce((s, d) => s + d.value, 0);
  const labelEvery = Math.ceil(data.length / 6);
  const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
  return (
    <figure className={cn("min-w-0", className)}>
      <figcaption className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-navy-900">{title}</span>
        <span className="text-sm text-muted tabular-nums">{total.toLocaleString("en-ZA")} total</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-auto w-full" role="img" aria-label={`${title}: ${total} over ${data.length} days`}>
        {[0, 0.5, 1].map((f) => {
          const y = P.t + ih - ih * f;
          return (
            <g key={f}>
              <line x1={P.l} x2={W - P.r} y1={y} y2={y} stroke="#E5EAED" strokeDasharray={f === 0 ? undefined : "3 3"} />
              <text x={P.l - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#687780">{Math.round(nice * f)}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const h = (d.value / nice) * ih;
          const x = P.l + i * bw + bw * 0.18;
          return (
            <g key={d.day}>
              <rect x={x} y={P.t + ih - h} width={bw * 0.64} height={Math.max(h, d.value ? 2 : 0)} rx={2} fill={color}>
                <title>{`${fmt(d.day)}: ${d.value}`}</title>
              </rect>
              {i % labelEvery === 0 ? (
                <text x={x + bw * 0.32} y={H - 6} textAnchor="middle" fontSize="10" fill="#687780">{fmt(d.day)}</text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead><tr><th>Date</th><th>Count</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.day}><td>{d.day}</td><td>{d.value}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

export function BarList({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.label}>
          <div className="flex justify-between text-sm"><span>{i.label}</span><span className="font-semibold tabular-nums">{i.value.toLocaleString("en-ZA")}</span></div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-canvas"><div className="h-full rounded-full bg-navy-900" style={{ width: `${(i.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}
