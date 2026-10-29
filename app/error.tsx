"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="grid min-h-screen place-items-center p-6">
    <div className="panel max-w-md p-7 text-center">
      <AlertTriangle className="mx-auto text-amber-300" size={28} />
      <h1 className="mt-4 text-lg font-semibold text-white">The workspace could not render</h1>
      <p className="mt-2 text-sm leading-6 text-slate-400">Your API target was not contacted. Retry the local interface, and refresh if the problem continues.</p>
      <button type="button" className="button-primary mt-5" onClick={reset}><RotateCcw size={15} />Retry workspace</button>
    </div>
  </main>;
}
