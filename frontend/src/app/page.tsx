import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="flex flex-col items-center justify-center gap-8 text-center px-4">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Google Docs Clone
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-md">
          Build. Collaborate. Share.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/login">
            <Button variant="outline" size="lg">
              Login
            </Button>
          </Link>
          <Link href="/register">
            <Button size="lg">Create Account</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
