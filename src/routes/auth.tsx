import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import "@lovable.dev/cloud-auth-js/styles.css";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Search = { next?: string | undefined };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    next: typeof s["next"] === "string" && s["next"].startsWith("/") && !s["next"].startsWith("//") ? s["next"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Shanta" },
      { name: "description", content: "Sign in or create your Shanta account." },
      { property: "og:title", content: "Sign in — Shanta" },
      { property: "og:description", content: "Sign in or create your Shanta account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const done = () => navigate({ to: next ?? "/account" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        done();
      } else if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + (next ?? "/account"), data: { full_name: name } },
        });
        if (error) throw error;
        if (data.session) done();
        else toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("Password reset link sent.");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const oauth = async (provider: "google" | "lovable") => {
    if (next) sessionStorage.setItem("shanta_next", next);
    const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (r.error) { toast.error(r.error.message ?? "Sign in failed"); return; }
    if (r.redirected) return;
    done();
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-extrabold">{mode === "up" ? "Create account" : mode === "forgot" ? "Reset password" : "Welcome back"}</h1>
      <p className="mt-2 text-muted-foreground">Reserve products, track orders, or join as a sourcing partner.</p>

      {mode !== "forgot" && (
        <div className="mt-8 space-y-3">
          <Button variant="outline" className="h-11 w-full" onClick={() => oauth("google")}>Continue with Google</Button>
          <button type="button" className="lovable-auth-button w-full" onClick={() => oauth("lovable")}>Continue with Lovable</button>
          <div className="flex items-center gap-3 py-2 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        {mode === "up" && (
          <div className="space-y-1.5"><Label htmlFor="name">Full name</Label><Input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="h-11" /></div>
        )}
        <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" /></div>
        {mode !== "forgot" && (
          <div className="space-y-1.5"><Label htmlFor="password">Password</Label><Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" /></div>
        )}
        <Button type="submit" className="h-11 w-full" disabled={busy}>
          {busy ? "Please wait…" : mode === "up" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
        </Button>
      </form>

      <div className="mt-6 flex justify-between text-sm">
        {mode === "in" ? (
          <>
            <button className="underline-offset-4 hover:underline" onClick={() => setMode("up")}>Create an account</button>
            <button className="text-muted-foreground underline-offset-4 hover:underline" onClick={() => setMode("forgot")}>Forgot password?</button>
          </>
        ) : (
          <button className="underline-offset-4 hover:underline" onClick={() => setMode("in")}>Back to sign in</button>
        )}
      </div>
    </div>
  );
}
