import Link from "next/link";
import { DocsLogo } from "@/components/DocsLogo";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#fafafa]">
      <header className="flex items-center justify-between px-6 py-4 md:px-12">
        <div className="flex items-center gap-2.5">
          <DocsLogo size={28} />
          <span className="text-lg font-semibold text-gray-900">Docs</span>
        </div>
        <Link
          href="/login"
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          Sign in
        </Link>
      </header>

      <main className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-3xl px-6 py-20 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-600">
            <DocsLogo size={18} />
            Docs
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
            Write together,
            <br />
            in real time.
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-lg text-gray-500">
            A simple document editor with live collaboration.
            Create, edit, and share — all in one place.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/register"
              className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-indigo-700"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
