import Link from "next/link";
import { DocsLogo } from "@/components/DocsLogo";
import { LoginForm } from "@/components/auth/LoginForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f9fbfd] p-4">
      <div className="w-full max-w-[420px] rounded-2xl border border-[#dadce0] bg-white px-8 py-10 shadow-[0_1px_3px_rgba(60,64,67,0.15)]">
        <div className="mb-6 flex flex-col items-center text-center">
          <DocsLogo size={44} />
          <h1 className="mt-4 text-[1.6rem] font-normal text-[#202124]">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-[#5f6368]">to continue to Docs</p>
        </div>

        <LoginForm />

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#dadce0]" />
          <span className="text-xs uppercase tracking-wide text-[#5f6368]">
            or
          </span>
          <div className="h-px flex-1 bg-[#dadce0]" />
        </div>

        <GoogleSignInButton />

        <div className="mt-8 text-center text-sm text-[#5f6368]">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-[#1a73e8] hover:underline"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
