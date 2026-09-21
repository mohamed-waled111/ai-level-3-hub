import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Level 3 Academic Hub" },
      { name: "description", content: "Sign in to the Level 3 student platform to access lectures, quizzes and exams." },
      { property: "og:title", content: "Sign in — Level 3 Academic Hub" },
      { property: "og:description", content: "Access lectures, quizzes, exams and summaries for Level 3." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentConfirmation, setSentConfirmation] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/", replace: true });
  }, [loading, user, navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: fullName } },
        });
        if (error) throw error;
        if (!data.session) {
          setSentConfirmation(true);
          toast.success("Check your email to confirm your account.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <Link to="/" className="mb-8 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="size-5" />
        </span>
        <span className="leading-tight">
          <span className="block font-extrabold">Level 3 Academic Hub</span>
          <span className="block text-xs text-muted-foreground">Faculty of Artificial Intelligence</span>
        </span>
      </Link>

      <div className="card-surface w-full max-w-md p-7">
        <h1 className="text-2xl font-bold">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Sign in to continue studying."
            : "Join the private Level 3 study platform."}
        </p>

        {sentConfirmation ? (
          <div className="mt-6 rounded-lg border border-border bg-secondary/60 p-4 text-sm">
            We sent a confirmation link to <strong>{email}</strong>. Open it to activate your account, then sign in.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>
        )}

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" className="w-full" onClick={google}>
          Continue with Google
        </Button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
          <button
            className="font-semibold text-primary hover:underline"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setSentConfirmation(false);
            }}
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>

      <p className="mt-6 max-w-md text-center text-xs text-muted-foreground">
        Independent student platform — not affiliated with the university.
      </p>
    </div>
  );
}
