// Centralised environment access. Public values are inlined at build time.
export const env = {
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  adsenseEnabled: process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true",
  adsenseClientId: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "",
  gaId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "",
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
  gscVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

/** Server-only secrets. Never import into client components. */
export function serverEnv() {
  return {
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    resendApiKey: process.env.RESEND_API_KEY || "",
    emailFrom: process.env.EMAIL_FROM || "Findora <no-reply@findora.co.za>",
    adminNotifyEmail: process.env.ADMIN_NOTIFICATION_EMAIL || "",
    turnstileSecret: process.env.TURNSTILE_SECRET_KEY || "",
    analyticsSalt: process.env.ANALYTICS_SALT || "findora-dev-salt-change-me",
  };
}
