import { Suspense } from "react";
import { DocsLogo } from "@/components/DocsLogo";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";

export default function VerifyEmailPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#fafafa] p-4">
      <div className="w-full max-w-[400px] rounded-xl border border-gray-200 bg-white px-8 py-10">
        <div className="mb-6 flex flex-col items-center text-center">
          <DocsLogo size={40} />
          <h1 className="mt-4 text-xl font-semibold text-gray-900">
            Verify your email
          </h1>
        </div>

        {/* useSearchParams needs a Suspense boundary */}
        <Suspense>
          <VerifyEmailForm />
        </Suspense>
      </div>
    </div>
  );
}
