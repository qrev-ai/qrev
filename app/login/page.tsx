"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center">
      <div className="w-full max-w-sm space-y-8 px-4">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-accent" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-text-primary">QRev</h1>
            <p className="text-text-secondary mt-1">
              AI-powered GTM platform
            </p>
          </div>
        </div>

        {/* Sign in button */}
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="w-full flex items-center justify-center gap-3 h-12 px-6 rounded-lg bg-surface-2 border border-border hover:bg-surface-3 hover:border-border-strong text-text-primary font-medium transition-all duration-150"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Sign in with Google
        </button>

        <button
          onClick={() => router.push("/")}
          className="w-full h-10 rounded-lg text-text-muted hover:text-text-secondary text-sm transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
