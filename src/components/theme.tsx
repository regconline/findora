"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "light" | "dark" | "system";
const KEY = "findora-theme";

/** Inline script that applies the saved/system theme before first paint (no flash). */
export const themeInitScript = `(function(){try{var m=localStorage.getItem('${KEY}')||'system';var d=m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';}catch(_){}})();`;

function apply(mode: Mode) {
  const dark = mode === "dark" || (mode === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  const el = document.documentElement;
  el.classList.toggle("dark", dark);
  el.style.colorScheme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0a161c" : "#102C3B");
}

function readMode(): Mode {
  try {
    return (localStorage.getItem(KEY) as Mode) || "system";
  } catch {
    return "system";
  }
}

/** Light / dark / system switch. Compact icon button cycles modes; `full` shows a segmented control. */
export function ThemeToggle({ full = false, className }: { full?: boolean; className?: string }) {
  const [mode, setMode] = useState<Mode | null>(null);

  useEffect(() => {
    const m = readMode();
    queueMicrotask(() => setMode(m));
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => readMode() === "system" && apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const set = (m: Mode) => {
    setMode(m);
    try {
      localStorage.setItem(KEY, m);
    } catch {
      /* private mode */
    }
    apply(m);
  };

  if (full) {
    const opts: { m: Mode; label: string; Icon: typeof Sun }[] = [
      { m: "light", label: "Light", Icon: Sun },
      { m: "dark", label: "Dark", Icon: Moon },
      { m: "system", label: "System", Icon: Monitor },
    ];
    return (
      <div role="radiogroup" aria-label="Colour theme" className={cn("inline-flex rounded-lg border border-line bg-canvas p-1", className)}>
        {opts.map(({ m, label, Icon }) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => set(m)}
            className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors", mode === m ? "bg-surface text-heading shadow-card" : "text-muted hover:text-heading")}>
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        ))}
      </div>
    );
  }

  const next: Mode = mode === "dark" ? "light" : "dark";
  return (
    <button type="button" onClick={() => set(next)} aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"} title="Toggle light / dark mode"
      className={cn("relative grid size-9 place-items-center rounded-lg text-heading transition-colors hover:bg-heading/5", className)}>
      <Sun className="size-[18px] rotate-0 scale-100 transition-transform duration-300 dark:-rotate-90 dark:scale-0" aria-hidden />
      <Moon className="absolute size-[18px] rotate-90 scale-0 transition-transform duration-300 dark:rotate-0 dark:scale-100" aria-hidden />
    </button>
  );
}
