import Link from "next/link";
import { DocsLogo } from "@/components/DocsLogo";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export default function RegisterPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f9fbfd] p-4">
      <div className="w-full max-w-[420px] rounded-2xl border border-[#dadce0] bg-white px-8 py-10 shadow-[0_1px_3px_rgba(60,64,67,0.15)]">
        <div className="mb-6 flex flex-col items-center text-center">
          <DocsLogo size={44} />
          <h1 className="mt-4 text-[1.6rem] font-normal text-[#202124]">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-[#5f6368]">to start using Docs</p>
        </div>

        <RegisterForm />

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#dadce0]" />
          <span className="text-xs uppercase tracking-wide text-[#5f6368]">
            or
          </span>
          <div className="h-px flex-1 bg-[#dadce0]" />
        </div>

        <GoogleSignInButton />

        <div className="mt-8 text-center text-sm text-[#5f6368]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-[#1a73e8] hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
