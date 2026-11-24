// Simple monochrome social icons (lucide v1 no longer ships brand marks).
type P = React.SVGProps<SVGSVGElement>;
const base = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true } as const;

export const FacebookIcon = (p: P) => (
  <svg {...base} {...p}><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H7.9v3h2.6V21h3z" /></svg>
);
export const InstagramIcon = (p: P) => (
  <svg {...base} fill="none" stroke="currentColor" strokeWidth={2} {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
);
export const LinkedinIcon = (p: P) => (
  <svg {...base} {...p}><path d="M4.5 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM3 9h3v12H3V9zm6 0h2.9v1.7c.4-.8 1.4-1.9 3.4-1.9 3 0 3.7 2 3.7 4.6V21h-3v-6.8c0-1.3-.1-2.9-1.9-2.9s-2.1 1.4-2.1 2.8V21H9V9z" /></svg>
);
export const TiktokIcon = (p: P) => (
  <svg {...base} {...p}><path d="M16.6 3c.4 2.2 1.8 3.6 4 3.8v3.1c-1.5 0-2.8-.4-4-1.2v6.2c0 3.4-2.6 5.6-5.6 5.6-3.2 0-5.6-2.5-5.6-5.5 0-3.3 2.9-5.8 6.4-5.4v3.2c-1.6-.4-3.2.6-3.2 2.2 0 1.3 1 2.3 2.3 2.3 1.4 0 2.4-1 2.4-2.6V3h3.3z" /></svg>
);
