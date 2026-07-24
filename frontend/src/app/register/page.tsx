import Link from "next/link";
import { DocsLogo } from "@/components/DocsLogo";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export default function RegisterPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#fafafa] p-4">
      <div className="w-full max-w-[400px] rounded-xl border border-gray-200 bg-white px-8 py-10">
        <div className="mb-6 flex flex-col items-center text-center">
          <DocsLogo size={40} />
          <h1 className="mt-4 text-xl font-semibold text-gray-900">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-gray-500">Get started for free</p>
        </div>

        <RegisterForm />

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <GoogleSignInButton />

        <div className="mt-8 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
