import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { formatEtb } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Reveal } from "@/components/Reveal";
import { ArrowRight, Bell, PackageCheck } from "lucide-react";

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
    <div className="workspace-page mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-14">
      <Reveal>
        <div className="grid gap-6 rounded-[2rem] bg-foreground p-6 text-background shadow-elevated sm:p-9 md:grid-cols-[1.2fr_.8fr] md:items-end md:p-12">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">Your Shanta account</p><h1 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">Orders, all in one place.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-background/65">Follow seller preorders and Dubai sourcing requests from the moment you submit them.</p></div>
          <div className="rounded-2xl border border-white/15 bg-white/5 p-5"><p className="text-xs text-background/55">Signed in as</p><p className="mt-1 break-all text-sm font-medium">{user?.email}</p><div className="mt-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-gold text-foreground"><PackageCheck className="size-5" /></span><div><p className="font-display text-2xl">{orders?.length ?? 0}</p><p className="text-xs text-background/55">orders and reservations</p></div></div></div>
        </div>
      </Reveal>
      <Reveal delay={80}>
      <section id="notifications" className="mt-12 scroll-mt-24">
        <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Stay in the loop</p><h2 className="mt-1 flex items-center gap-2 font-display text-3xl font-medium"><Bell className="size-5" /> Order notifications</h2></div><span className="text-xs text-muted-foreground">Latest updates on your orders</span></div>
        <div className="divide-y overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          {loadingNotifications && <p className="p-4 text-sm text-muted-foreground">Loading notifications…</p>}
          {!loadingNotifications && notifications.length === 0 && <p className="p-4 text-sm text-muted-foreground">You're all caught up.</p>}
          {notifications.map((notification) => (
            <div key={notification.id} className={`flex flex-wrap items-center justify-between gap-3 p-5 transition-colors hover:bg-secondary/50 ${notification.read_at ? "" : "bg-gold/5"}`}>
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
      </Reveal>
      <Reveal delay={120}>
      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your shopping activity</p><h2 className="mt-1 font-display text-3xl font-medium">Recent orders</h2></div><Link to="/shop" className="inline-flex items-center gap-1 text-sm font-medium transition hover:text-muted-foreground">Keep browsing <ArrowRight className="size-4" /></Link></div>
      <div className="divide-y overflow-hidden rounded-3xl border border-border bg-card shadow-card">
        {isLoading && <p className="p-6 text-muted-foreground">Loading…</p>}
        {orders?.length === 0 && (
          <div className="p-10 text-center">
            <p className="text-muted-foreground">You haven't placed an order yet.</p>
            <Button asChild className="mt-4"><Link to="/shop">Browse the shop</Link></Button>
          </div>
        )}
        {orders?.map((o) => (
          <Link key={o.id} to="/account/orders/$id" params={{ id: o.id }} className="group flex flex-col gap-3 p-5 transition-colors hover:bg-secondary/40 sm:p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="tabular text-xs text-muted-foreground">{o.reference} · {o.order_type === "seller_listing" ? "Seller preorder" : "Dubai sourcing"} · {new Date(o.created_at).toLocaleDateString()}</p>
              <p className="font-medium leading-6">{o.order_items.map((i) => `${i.product_name}${i.variant_label ? ` (${i.variant_label})` : ""} × ${i.quantity}`).join(", ")}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="tabular text-sm font-semibold">{formatEtb(o.subtotal_etb_cents)}</span>
              <StatusBadge status={o.status} />
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden />
            </div>
          </Link>
        ))}
      </div>
      </section>
      </Reveal>
    </div>
  );
}
