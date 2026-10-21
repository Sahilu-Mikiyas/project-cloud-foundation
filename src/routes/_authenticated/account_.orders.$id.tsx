import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { formatEtb, ORDER_FLOW, ORDER_STATUS_LABEL } from "@/lib/format";
import { productImage } from "@/lib/product-images";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/account_/orders/$id")({
  head: () => ({
    meta: [
      { title: "Order details — Shanta" },
      { name: "description", content: "Track your Shanta order from Dubai to handover." },
      { property: "og:title", content: "Order details — Shanta" },
      { property: "og:description", content: "Track your Shanta order from Dubai to handover." },
    ],
  }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const { data: o, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*), order_events(id, status, note, created_at)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="mx-auto max-w-5xl px-4 py-12">Loading…</div>;
  if (!o) return <div className="mx-auto max-w-5xl px-4 py-12">Order not found. <Link to="/account" className="underline">Back</Link></div>;

  const currentIdx = ORDER_FLOW.indexOf(o.status as (typeof ORDER_FLOW)[number]);
  const events = [...o.order_events].sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:px-8">
      <Link to="/account" className="text-sm text-muted-foreground hover:underline">← My orders</Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="tabular text-3xl font-extrabold">{o.reference}</h1>
        <StatusBadge status={o.status} />
      </div>

      <div className="mt-10 grid gap-10 md:grid-cols-12">
        <div className="space-y-6 md:col-span-7">
          {o.order_items.map((i) => (
            <div key={i.id} className="flex gap-4">
              <img src={productImage({ image_url: i.image_url, slug: null })} alt="" className="h-28 w-24 rounded-md object-cover" />
              <div>
                <p className="font-semibold">{i.product_name}</p>
                <p className="text-sm text-muted-foreground">{i.variant_label} · Qty {i.quantity}</p>
                <p className="tabular mt-1 text-sm">{formatEtb(i.unit_price_etb_cents)} each</p>
              </div>
            </div>
          ))}

          <div className="rounded-md bg-card p-5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Order total</span><span className="tabular">{formatEtb(o.subtotal_etb_cents)}</span></div>
            <div className="mt-2 flex justify-between font-semibold"><span>Reservation deposit</span><span className="tabular">{formatEtb(o.deposit_etb_cents)}</span></div>
            <div className="mt-2 flex justify-between"><span className="text-muted-foreground">Balance on handover</span><span className="tabular">{formatEtb(o.subtotal_etb_cents - o.deposit_etb_cents)}</span></div>
            {o.status === "awaiting_customer_deposit" && (
              <p className="mt-4 rounded bg-muted p-3 text-xs text-muted-foreground">Deposit not yet paid. Online deposit payment is coming soon — our team will contact you to confirm.</p>
            )}
          </div>
        </div>

        <div className="md:col-span-5">
          <h2 className="text-lg font-bold">Progress</h2>
          <ol className="mt-4 space-y-4">
            {ORDER_FLOW.map((s, idx) => {
              const done = currentIdx >= 0 && idx < currentIdx;
              const current = idx === currentIdx;
              return (
                <li key={s} className="flex items-center gap-3">
                  <span className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-xs transition-colors duration-300", done && "border-success bg-success text-success-foreground", current && "border-primary bg-primary text-primary-foreground")}>
                    {done ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                  </span>
                  <span className={cn("text-sm", !done && !current && "text-muted-foreground", current && "font-semibold")}>{ORDER_STATUS_LABEL[s]}</span>
                </li>
              );
            })}
          </ol>
          <h2 className="mt-10 text-lg font-bold">History</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex justify-between gap-4">
                <span>{ORDER_STATUS_LABEL[e.status]}{e.note ? ` — ${e.note}` : ""}</span>
                <span className="tabular shrink-0 text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
