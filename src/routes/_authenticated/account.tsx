import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { formatEtb } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  const qc = useQueryClient();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, reference, order_type, status, subtotal_etb_cents, deposit_etb_cents, created_at, order_items(product_name, variant_label, quantity)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: notifications = [], isLoading: loadingNotifications } = useQuery({
    queryKey: ["my-notifications", user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_notifications")
        .select("id, order_id, title, body, created_at, read_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const markRead = async (notificationId: string) => {
    const { error } = await supabase.rpc("mark_notification_read", { _notification_id: notificationId });
    if (error) { toast.error("Could not mark notification as read"); return; }
    qc.invalidateQueries({ queryKey: ["my-notifications", user?.id] });
    qc.invalidateQueries({ queryKey: ["unread-notifications", user?.id] });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:px-8">
      <h1 className="text-3xl font-extrabold">My orders</h1>
      <p className="mt-1 text-muted-foreground">{user?.email}</p>
      <section id="notifications" className="mt-8">
        <h2 className="text-xl font-bold">Order notifications</h2>
        <div className="mt-3 divide-y rounded-md border bg-card">
          {loadingNotifications && <p className="p-4 text-sm text-muted-foreground">Loading notifications…</p>}
          {!loadingNotifications && notifications.length === 0 && <p className="p-4 text-sm text-muted-foreground">You're all caught up.</p>}
          {notifications.map((notification) => (
            <div key={notification.id} className={`flex flex-wrap items-center justify-between gap-3 p-4 ${notification.read_at ? "" : "bg-sand/30"}`}>
              <Link to="/account/orders/$id" params={{ id: notification.order_id }} className="min-w-0 flex-1">
                <p className="font-semibold">{notification.title}</p>
                <p className="text-sm text-muted-foreground">{notification.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(notification.created_at).toLocaleString()}</p>
              </Link>
              {!notification.read_at && <Button size="sm" variant="outline" onClick={() => markRead(notification.id)}>Mark read</Button>}
            </div>
          ))}
        </div>
      </section>
      <div className="mt-8 divide-y rounded-md border bg-card">
        {isLoading && <p className="p-6 text-muted-foreground">Loading…</p>}
        {orders?.length === 0 && (
          <div className="p-10 text-center">
            <p className="text-muted-foreground">You haven't placed an order yet.</p>
            <Button asChild className="mt-4"><Link to="/shop">Browse the shop</Link></Button>
          </div>
        )}
        {orders?.map((o) => (
          <Link key={o.id} to="/account/orders/$id" params={{ id: o.id }} className="flex flex-col gap-2 p-5 transition-colors hover:bg-sand/40 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="tabular text-xs text-muted-foreground">{o.reference} · {o.order_type === "seller_listing" ? "Seller preorder" : "Dubai sourcing"} · {new Date(o.created_at).toLocaleDateString()}</p>
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
