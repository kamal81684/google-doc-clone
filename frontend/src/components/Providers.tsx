"use client";

import { Toaster } from "react-hot-toast";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ConfirmProvider } from "@/components/ConfirmProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const content = (
    <ConfirmProvider>
      {children}
      <Toaster position="top-right" />
    </ConfirmProvider>
  );

  // Only wrap when a client ID is configured; otherwise the Google button is hidden.
  if (googleClientId) {
    return (
      <GoogleOAuthProvider clientId={googleClientId}>
        {content}
      </GoogleOAuthProvider>
    );
  }

  return content;
}
