import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, BadgeCheck, PackageCheck } from "lucide-react";
import { heroImage } from "@/lib/product-images";

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

  const oauth = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + (next ?? "/account") },
      });
      if (error) throw error;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed");
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:py-10 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[1.05fr_.95fr]">
      <aside className="relative hidden min-h-[38rem] flex-col justify-between overflow-hidden rounded-[2rem] bg-foreground p-8 text-background lg:flex xl:p-12">
        <img src={heroImage} alt="" className="absolute inset-0 size-full object-cover opacity-65" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/25" />
        <div className="relative"><Link to="/" className="font-display text-2xl">Shanta<span className="text-gold">.</span></Link><p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">Thoughtful finds, closer to home</p></div>
        <div className="relative max-w-xl"><p className="font-display text-5xl leading-[1.05] xl:text-6xl">Shop local.<br /><span className="italic">Discover more.</span></p><p className="mt-5 max-w-md text-sm leading-6 text-white/75">From seller-set prices and preorder terms to finds sourced across global markets, keep every next step clear.</p><div className="mt-8 flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs backdrop-blur"><BadgeCheck className="size-3.5 text-gold" /> Verified sellers</span><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs backdrop-blur"><PackageCheck className="size-3.5 text-gold" /> Clear order progress</span></div></div>
        <Link to="/shop" className="relative inline-flex items-center gap-2 text-xs font-medium text-white/75 transition hover:text-white">Explore the collection <ArrowRight className="size-3.5" /></Link>
      </aside>

      <div className="mx-auto flex w-full max-w-md flex-col justify-center rounded-[2rem] border border-border bg-card px-6 py-8 shadow-card sm:px-10 sm:py-10">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Your Shanta account</p>
      <h1 className="mt-2 font-display text-4xl font-medium tracking-tight">{mode === "up" ? "Make yourself at home." : mode === "forgot" ? "Let’s get you back." : "Welcome back."}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{mode === "up" ? "Create an account to place orders and follow your finds." : mode === "forgot" ? "We’ll send a link to reset your password." : "Sign in to follow your orders and discover new finds."}</p>

      {mode !== "forgot" && (
        <div className="mt-8 space-y-3">
          <Button variant="outline" className="h-11 w-full" onClick={() => void oauth()} disabled={busy}>Continue with Google</Button>
          <div className="flex items-center gap-3 py-2 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or continue with email<span className="h-px flex-1 bg-border" /></div>
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
      <p className="mt-8 border-t border-border pt-5 text-center text-xs leading-5 text-muted-foreground">Your account keeps seller preorders and sourcing requests from every market in one place.</p>
      </div>
    </div>
  );
}
