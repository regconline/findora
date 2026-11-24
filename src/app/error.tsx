"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="flex min-h-[70dvh] items-center justify-center px-4 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-3 text-muted">An unexpected error occurred. Please try again. If the problem continues, contact us{error.digest ? ` and quote reference ${error.digest}` : ""}.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={reset} className="h-10 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600">Try again</button>
          <Link href="/" className="grid h-10 place-items-center rounded-lg border border-line px-4 text-sm font-semibold text-heading">Go home</Link>
        </div>
      </div>
    </main>
  );
}
