import Link from "next/link";
import { DocsLogo } from "@/components/DocsLogo";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 md:px-12">
        <div className="flex items-center gap-3">
          <DocsLogo size={32} />
          <span className="text-[22px] text-[#5f6368]">Docs</span>
        </div>
        <Link
          href="/login"
          className="rounded-full bg-[#1a73e8] px-6 py-2 text-sm font-medium text-white transition hover:bg-[#1765cc]"
        >
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <main className="flex flex-1 items-center">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:px-12">
          <div>
            <p className="mb-3 text-sm font-medium uppercase tracking-wide text-[#1a73e8]">
              Docs
            </p>
            <h1 className="text-4xl font-normal leading-tight text-[#202124] md:text-5xl">
              Create and collaborate on documents in real time
            </h1>
            <p className="mt-5 max-w-md text-lg text-[#5f6368]">
              Write, edit, and share documents together. Every change syncs
              instantly, with live cursors so you always see who&apos;s working
              alongside you.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/register"
                className="rounded-full bg-[#1a73e8] px-7 py-3 text-sm font-medium text-white transition hover:bg-[#1765cc]"
              >
                Get started
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-[#dadce0] px-7 py-3 text-sm font-medium text-[#1a73e8] transition hover:bg-[#e8f0fe]"
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* Faux document preview */}
          <div className="hidden justify-center md:flex">
            <div className="w-[340px] rotate-1 rounded-lg border border-[#dadce0] bg-white p-8 shadow-[0_8px_30px_rgba(60,64,67,0.18)]">
              <div className="mb-5 flex items-center gap-3">
                <DocsLogo size={28} />
                <div className="h-3 w-32 rounded bg-[#e8eaed]" />
              </div>
              <div className="space-y-3">
                <div className="h-3 w-3/4 rounded bg-[#e8eaed]" />
                <div className="h-3 w-full rounded bg-[#e8eaed]" />
                <div className="h-3 w-5/6 rounded bg-[#e8eaed]" />
                <div className="h-3 w-full rounded bg-[#e8eaed]" />
                <div className="h-3 w-2/3 rounded bg-[#e8eaed]" />
                <div className="mt-6 h-3 w-1/2 rounded bg-[#d3e3fd]" />
                <div className="h-3 w-4/5 rounded bg-[#e8eaed]" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
