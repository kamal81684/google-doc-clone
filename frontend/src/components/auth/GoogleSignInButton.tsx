"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { GoogleLogin } from "@react-oauth/google";
import { googleLogin } from "@/services/auth.service";
import { getPostLoginPath } from "@/lib/redirect";

/**
 * Renders Google's official Sign-In button. Only shows when
 * NEXT_PUBLIC_GOOGLE_CLIENT_ID is configured (the provider is mounted in Providers).
 * On success it forwards the ID token to the backend, which verifies it and sets
 * the same httpOnly session cookie used by email/password login.
 */
export function GoogleSignInButton() {
  const router = useRouter();

  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <div className="flex justify-center">
      <GoogleLogin
        theme="outline"
        size="large"
        width="320"
        text="continue_with"
        shape="pill"
        onSuccess={async (credentialResponse) => {
          const credential = credentialResponse.credential;
          if (!credential) {
            toast.error("No credential returned from Google");
            return;
          }
          try {
            const response = await googleLogin(credential);
            if (response.success) {
              toast.success("Signed in with Google");
              router.push(getPostLoginPath());
            } else {
              toast.error(response.message || "Google sign-in failed");
            }
          } catch (error) {
            const message =
              (error as { response?: { data?: { message?: string } } })
                ?.response?.data?.message || "Google sign-in failed";
            toast.error(message);
          }
        }}
        onError={() => {
          toast.error("Google sign-in failed");
        }}
      />
    </div>
  );
}
