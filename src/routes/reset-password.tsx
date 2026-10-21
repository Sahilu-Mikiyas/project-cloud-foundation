import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Shanta" },
      { name: "description", content: "Choose a new password for your Shanta account." },
      { property: "og:title", content: "Set a new password — Shanta" },
      { property: "og:description", content: "Choose a new password for your Shanta account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-extrabold">Set a new password</h1>
      <form
        className="mt-8 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const { error } = await supabase.auth.updateUser({ password });
          setBusy(false);
          if (error) { toast.error(error.message); return; }
          toast.success("Password updated");
          navigate({ to: "/account" });
        }}
      >
        <div className="space-y-1.5"><Label htmlFor="pw">New password</Label><Input id="pw" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" /></div>
        <Button type="submit" className="h-11 w-full" disabled={busy}>Update password</Button>
      </form>
    </div>
  );
}
