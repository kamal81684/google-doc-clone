"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resendVerificationCode, verifyEmail } from "@/services/auth.service";
import { getPostLoginPath } from "@/lib/redirect";

const RESEND_SECONDS = 60;

const errorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

export function VerifyEmailForm() {
  const router = useRouter();
  const email = useSearchParams().get("email") ?? "";
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // A code was just sent by sign-up or login, so start on cooldown
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      toast.error("Enter the 6-digit code from the email");
      return;
    }
    setIsLoading(true);
    try {
      await verifyEmail(email, code);
      toast.success("Email verified. Welcome!");
      router.push(getPostLoginPath());
    } catch (error) {
      const data = (error as { response?: { data?: { code?: string } } })?.response?.data;
      if (data?.code === "ALREADY_VERIFIED") {
        toast.success("Already verified. Please sign in.");
        router.push("/login");
        return;
      }
      toast.error(errorMessage(error, "Couldn't verify the code"));
      setCode("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    try {
      const res = await resendVerificationCode(email);
      toast.success("A new code is on its way");
      setCooldown(res.retryAfter ?? RESEND_SECONDS);
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't resend the code"));
    }
  };

  return (
    <form onSubmit={handleVerify} className="space-y-4">
      <p className="text-center text-sm text-gray-500">
        We sent a 6-digit code to{" "}
        <span className="font-medium text-gray-900">{email || "your email"}</span>.
        Enter it below to finish signing up.
      </p>

      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        placeholder="000000"
        aria-label="Verification code"
        className="h-12 text-center text-2xl font-semibold tracking-[0.5em]"
      />

      <Button
        type="submit"
        className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
        disabled={isLoading || code.length !== 6 || !email}
      >
        {isLoading ? "Verifying..." : "Verify"}
      </Button>

      <div className="text-center text-sm text-gray-500">
        Didn&apos;t get it? Check spam, or{" "}
        {cooldown > 0 ? (
          <span className="text-gray-400">resend in {cooldown}s</span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            resend the code
          </button>
        )}
      </div>

      <div className="text-center text-sm">
        <Link href="/login" className="text-gray-500 hover:text-gray-700">
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
