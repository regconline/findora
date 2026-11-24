/**
 * Decorative hero illustration: a map with location pins and a generic listing card.
 * Uses placeholder bars only — no invented business names, ratings or statistics.
 */
export function HeroIllustration({ className }: { className?: string }) {
  return (
    <div aria-hidden className={className}>
      <svg viewBox="0 0 520 460" className="h-auto w-full" fill="none">
        {/* map panel */}
        <rect x="40" y="30" width="440" height="330" rx="28" fill="#17394B" />
        <g opacity="0.55" stroke="#2c5468" strokeWidth="10" strokeLinecap="round">
          <path d="M40 140 C 160 120, 220 220, 480 180" />
          <path d="M150 30 C 170 140, 120 240, 170 360" />
          <path d="M330 30 C 300 150, 380 250, 360 360" />
        </g>
        <g opacity="0.35" fill="#2c5468">
          <rect x="70" y="60" width="60" height="44" rx="8" />
          <rect x="200" y="250" width="80" height="50" rx="8" />
          <rect x="390" y="80" width="60" height="60" rx="8" />
          <rect x="400" y="260" width="56" height="70" rx="8" />
        </g>
        {/* pins */}
        <g className="motion-safe:animate-[float_6s_ease-in-out_infinite]">
          <path d="M250 70c-22 0-40 17-40 39 0 30 40 66 40 66s40-36 40-66c0-22-18-39-40-39z" fill="#20B88A" />
          <circle cx="250" cy="108" r="14" fill="#fff" />
        </g>
        <g className="motion-safe:animate-[float_7s_ease-in-out_infinite_0.8s]">
          <path d="M120 170c-14 0-25 11-25 25 0 19 25 42 25 42s25-23 25-42c0-14-11-25-25-25z" fill="#F2A93B" />
          <circle cx="120" cy="194" r="9" fill="#fff" />
        </g>
        <g className="motion-safe:animate-[float_8s_ease-in-out_infinite_1.6s]">
          <path d="M410 165c-14 0-25 11-25 25 0 19 25 42 25 42s25-23 25-42c0-14-11-25-25-25z" fill="#ffffff" />
          <circle cx="410" cy="189" r="9" fill="#17394B" />
        </g>
        {/* search bar */}
        <g>
          <rect x="70" y="300" width="300" height="46" rx="14" fill="#fff" />
          <circle cx="96" cy="323" r="8" stroke="#687780" strokeWidth="3" />
          <path d="M102 329l6 6" stroke="#687780" strokeWidth="3" strokeLinecap="round" />
          <rect x="118" y="317" width="140" height="12" rx="6" fill="#E5EAED" />
          <rect x="300" y="308" width="60" height="30" rx="10" fill="#20B88A" />
        </g>
        {/* listing card */}
        <g className="motion-safe:animate-[float_9s_ease-in-out_infinite_0.4s]">
          <rect x="250" y="230" width="250" height="200" rx="22" fill="#fff" />
          <rect x="250" y="230" width="250" height="200" rx="22" stroke="#E5EAED" />
          <rect x="272" y="252" width="52" height="52" rx="14" fill="#102C3B" />
          <path d="M286 280h24M298 268v24" stroke="#20B88A" strokeWidth="4" strokeLinecap="round" />
          <rect x="338" y="258" width="130" height="14" rx="7" fill="#102C3B" />
          <rect x="338" y="282" width="90" height="10" rx="5" fill="#C7D3D9" />
          <rect x="272" y="320" width="206" height="10" rx="5" fill="#E5EAED" />
          <rect x="272" y="340" width="170" height="10" rx="5" fill="#E5EAED" />
          <rect x="272" y="372" width="96" height="36" rx="10" fill="#102C3B" />
          <path d="M296 383c3 6 7 10 13 13l3-3c1-1 2-1 3 0l4 2v5c0 1-1 2-2 2-11-1-20-10-21-21 0-1 1-2 2-2h5l2 4c0 1 0 2-1 3z" fill="#fff" />
          <rect x="324" y="386" width="32" height="8" rx="4" fill="#fff" opacity="0.8" />
          <rect x="378" y="372" width="100" height="36" rx="10" fill="#20B88A" />
          <rect x="398" y="386" width="60" height="8" rx="4" fill="#fff" opacity="0.9" />
        </g>
      </svg>
    </div>
  );
}
