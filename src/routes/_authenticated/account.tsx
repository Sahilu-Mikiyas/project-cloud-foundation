import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { formatEtb } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My orders — Shanta" },
      { name: "description", content: "Your Shanta reservations and order progress." },
      { property: "og:title", content: "My orders — Shanta" },
      { property: "og:description", content: "Your Shanta reservations and order progress." },
    ],
  }),
  component: Account,
});

function Account() {
  const { user } = useAuth();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, reference, status, subtotal_etb_cents, deposit_etb_cents, created_at, order_items(product_name, variant_label, quantity)")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:px-8">
      <h1 className="text-3xl font-extrabold">My orders</h1>
      <p className="mt-1 text-muted-foreground">{user?.email}</p>
      <div className="mt-8 divide-y rounded-md border bg-card">
        {isLoading && <p className="p-6 text-muted-foreground">Loading…</p>}
        {orders?.length === 0 && (
          <div className="p-10 text-center">
            <p className="text-muted-foreground">You haven't reserved anything yet.</p>
            <Button asChild className="mt-4"><Link to="/shop">Browse the shop</Link></Button>
          </div>
        )}
        {orders?.map((o) => (
          <Link key={o.id} to="/account/orders/$id" params={{ id: o.id }} className="flex flex-col gap-2 p-5 transition-colors hover:bg-sand/40 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="tabular text-xs text-muted-foreground">{o.reference} · {new Date(o.created_at).toLocaleDateString()}</p>
              <p className="font-semibold">{o.order_items.map((i) => `${i.product_name}${i.variant_label ? ` (${i.variant_label})` : ""} × ${i.quantity}`).join(", ")}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="tabular text-sm">{formatEtb(o.subtotal_etb_cents)}</span>
              <StatusBadge status={o.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
