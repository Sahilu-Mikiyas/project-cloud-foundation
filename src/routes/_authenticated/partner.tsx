import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatEtb } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/partner")({
  head: () => ({
    meta: [
      { title: "Partner portal — Shanta" },
      { name: "description", content: "Apply as a verified Dubai sourcing partner and view open orders." },
      { property: "og:title", content: "Partner portal — Shanta" },
      { property: "og:description", content: "Apply as a verified Dubai sourcing partner." },
    ],
  }),
  component: Partner,
});

function Partner() {
  const { user, isSupplier } = useAuth();
  const qc = useQueryClient();
  const { data: supplier, isLoading } = useQuery({
    queryKey: ["my-supplier", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("suppliers").select("*").eq("user_id", user!.id).maybeSingle()).data,
  });
  const { data: openOrders = [] } = useQuery({
    queryKey: ["open-orders"],
    enabled: isSupplier,
    queryFn: async () =>
      (await supabase.from("orders").select("id, reference, subtotal_etb_cents, created_at, order_items(product_name, variant_label, quantity)").eq("status", "open_for_assignment").order("created_at")).data ?? [],
  });

  const [form, setForm] = useState({ business_name: "", phone: "", base_city: "Dubai", notes: "" });

  if (isLoading) return <div className="mx-auto max-w-3xl px-4 py-12">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-8">
      <h1 className="text-3xl font-extrabold">Partner portal</h1>
      <p className="mt-2 text-muted-foreground">Verified partners in Dubai source products for Shanta customers and commit a fee for each order they take.</p>

      {!supplier ? (
        <form
          className="mt-8 max-w-lg space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const { error } = await supabase.from("suppliers").insert({ ...form, user_id: user!.id });
            if (error) { toast.error(error.message); return; }
            toast.success("Application submitted");
            qc.invalidateQueries({ queryKey: ["my-supplier"] });
          }}
        >
          <div className="space-y-1.5"><Label htmlFor="bn">Business or trading name</Label><Input id="bn" required value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className="h-11" /></div>
          <div className="space-y-1.5"><Label htmlFor="ph">Phone (WhatsApp)</Label><Input id="ph" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-11" /></div>
          <div className="space-y-1.5"><Label htmlFor="city">Base city</Label><Input id="city" value={form.base_city} onChange={(e) => setForm({ ...form, base_city: e.target.value })} className="h-11" /></div>
          <div className="space-y-1.5"><Label htmlFor="notes">Experience & travel schedule</Label><Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <Button type="submit" className="h-11">Apply to become a partner</Button>
        </form>
      ) : (
        <div className="mt-8 rounded-md border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{supplier.business_name}</p>
              <p className="text-sm text-muted-foreground">{supplier.base_city} · {supplier.phone}</p>
            </div>
            <StatusBadge status={supplier.status} label={{ pending: "Under review", verified: "Verified", rejected: "Not approved", suspended: "Suspended" }[supplier.status]} />
          </div>
          {supplier.status === "pending" && <p className="mt-4 text-sm text-muted-foreground">Our team is reviewing your application. You'll see open orders here once you're verified.</p>}
        </div>
      )}

      {isSupplier && (
        <section className="mt-12">
          <h2 className="text-xl font-bold">Open orders</h2>
          <p className="mt-1 text-sm text-muted-foreground">Taking orders and paying assignment fees is coming next.</p>
          <div className="mt-4 divide-y rounded-md border bg-card">
            {openOrders.length === 0 && <p className="p-6 text-muted-foreground">No open orders right now.</p>}
            {openOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between p-5">
                <div>
                  <p className="tabular text-xs text-muted-foreground">{o.reference}</p>
                  <p className="font-medium">{o.order_items.map((i) => `${i.product_name} (${i.variant_label}) × ${i.quantity}`).join(", ")}</p>
                </div>
                <span className="tabular text-sm">{formatEtb(o.subtotal_etb_cents)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
